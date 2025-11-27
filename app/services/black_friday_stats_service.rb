# frozen_string_literal: true

class BlackFridayStatsService
  CACHE_KEY = "black_friday_stats"
  CACHE_EXPIRATION = 10.minutes

  class << self
    def fetch_stats
      Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_EXPIRATION) do
        calculate_stats
      end
    end

    def calculate_stats
      black_friday_code = SearchProducts::BLACK_FRIDAY_CODE
      thirty_days_ago = 30.days.ago

      products_by_id = fetch_products_with_offer_code(black_friday_code)
      return default_stats if products_by_id.empty?

      purchase_stats = fetch_purchase_stats(products_by_id.keys, thirty_days_ago)
      average_discount_percentage = calculate_average_discount_percentage(
        purchase_counts: purchase_stats[:counts_by_product],
        products_by_id:,
        code: black_friday_code,
        since: thirty_days_ago
      )

      default_stats.merge(
        active_deals_count: products_by_id.size,
        revenue_cents: purchase_stats[:total_revenue_cents],
        average_discount_percentage:
      )
    rescue => e
      # ! NOTE: Given the criticality of the Black Friday period,
      # ! we don't want to risk failing the request if we can't calculate the stats
      # ! so we return the default stats in the worst scenario and they won't be shown in the UI
      Rails.logger.error "Error calculating Black Friday stats: #{e.message}"
      default_stats
    end

    private
      def fetch_products_with_offer_code(code)
        response = Link.search(
          query: {
            bool: {
              must: [
                { term: { "offer_codes.code": code } },
                { term: { is_alive: true } }
              ]
            }
          },
          size: 10_000,
          _source: ["price_cents"],
          track_total_hits: true
        )

        response.response.dig("hits", "hits").to_a.each_with_object({}) do |hit, hash|
          hash[hit["_id"].to_i] = {
            price_cents: hit.dig("_source", "price_cents").to_i,
            offer_codes: hit.dig("_source", "offer_codes").to_a.map { |code| code["code"] }
          }
        end
      end

      def fetch_purchase_stats(product_ids, since)
        return { total_revenue_cents: 0, counts_by_product: {} } if product_ids.empty?

        body = {
          query: {
            bool: {
              filter: [
                { terms: { product_id: product_ids } },
                { range: { created_at: { gte: since.iso8601 } } },
                { term: { stripe_refunded: false } },
                { term: { purchase_state: "successful" } }
              ]
            }
          },
          size: 0,
          aggs: {
            total_revenue: { sum: { field: "price_cents" } },
            purchases_by_product: {
              terms: {
                field: "product_id",
                size: [product_ids.size, 10_000].min
              },
              aggs: {
                revenue: { sum: { field: "price_cents" } }
              }
            }
          }
        }

        response = Purchase.search(body)

        counts_by_product = response.aggregations.purchases_by_product.buckets.each_with_object({}) do |bucket, hash|
          hash[bucket["key"].to_i] = bucket["doc_count"]
        end

        {
          total_revenue_cents: response.aggregations.total_revenue.value.to_i,
          counts_by_product:
        }
      end

      def calculate_average_discount_percentage(purchase_counts:, products_by_id:, code:, since:)
        return 0 if purchase_counts.blank?

        discounts = discount_percentages_by_product(products_by_id:, code:, since:)
        eligible_counts = purchase_counts.select { |product_id, _| discounts.key?(product_id) }
        return 0 if eligible_counts.blank?

        total_purchases = eligible_counts.values.sum
        weighted_sum = eligible_counts.sum do |product_id, count|
          discounts[product_id] * count
        end

        (weighted_sum / total_purchases.to_f).round(2)
      end

      def discount_percentages_by_product(products_by_id:, code:, since:)
        product_ids = products_by_id.keys
        OfferCode.where(code:)
                 .where(created_at: since..)
                 .includes(:offer_codes_products)
                 .each_with_object({}) do |offer_code, hash|
          targets = offer_code.universal? ? product_ids : product_ids_for_offer_code(offer_code, product_ids)
          targets.each do |product_id|
            product = products_by_id[product_id]
            next unless product

            percent = offer_code_percentage_for_product(offer_code, product[:price_cents])
            next if percent.zero?

            hash[product_id] = percent
          end
        end
      end

      def offer_code_percentage_for_product(offer_code, product_price_cents)
        return 0 if product_price_cents.to_i <= 0

        if offer_code.is_percent?
          offer_code.amount_percentage.to_f
        elsif offer_code.amount_cents.present?
          [(offer_code.amount_cents.to_f / product_price_cents) * 100, 100].min.round(2)
        else
          0
        end
      end

      def product_ids_for_offer_code(offer_code, available_ids)
        return [] if available_ids.blank?

        offer_code.offer_codes_products.map(&:product_id) & available_ids
      end

      def default_stats
        {
          active_deals_count: 0,
          revenue_cents: 0,
          average_discount_percentage: 0
        }
      end
  end
end
