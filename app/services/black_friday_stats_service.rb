# frozen_string_literal: true

class BlackFridayStatsService
  BLACK_FRIDAY_CODE = SearchProducts::BLACK_FRIDAY_CODE
  CACHE_KEY = "black_friday_stats"
  CACHE_EXPIRATION = 10.minutes

  def self.fetch_stats
    Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_EXPIRATION) do
      calculate_stats
    end
  end

  def self.calculate_stats
    offer_codes = OfferCode.alive.where(code: BLACK_FRIDAY_CODE)

    active_deals_count = offer_codes.count

    purchases = Purchase
      .joins(:offer_code)
      .where(offer_codes: { code: BLACK_FRIDAY_CODE, deleted_at: nil })
      .counts_towards_offer_code_uses

    revenue_cents = purchases.sum(:price_cents)

    total_discount_percentage = 0
    discount_count = 0

    offer_codes.each do |offer_code|
      next unless offer_code.amount_percentage.present?

      total_discount_percentage += offer_code.amount_percentage
      discount_count += 1
    end

    average_discount_percentage = discount_count.positive? ? (total_discount_percentage / discount_count.to_f).round : 0

    {
      active_deals_count:,
      revenue_cents:,
      average_discount_percentage:,
    }
  end
end
