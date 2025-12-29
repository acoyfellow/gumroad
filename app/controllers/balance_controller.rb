# frozen_string_literal: true

class BalanceController < Sellers::BaseController
  include CurrencyHelper
  include PayoutsHelper
  include Pagy::Backend

  PAST_PAYMENTS_PER_PAGE = 3

  layout "inertia", only: [:index]

  def index
    authorize :balance

    @title = "Payouts"

    render inertia: "Payouts/Index",
           props: {
             next_payout_period_data: -> { next_payout_period_data },
             processing_payout_periods_data: -> { processing_payout_periods_data },
             payouts_status: -> { current_seller.payouts_status },
             payouts_paused_by: -> { current_seller.payouts_paused_by_source },
             payouts_paused_for_reason: -> { current_seller.payouts_paused_for_reason },
             instant_payout: -> { instant_payout_data },
             show_instant_payouts_notice: -> { current_seller.eligible_for_instant_payouts? && !current_seller.active_bank_account&.supports_instant_payouts? },
             tax_center_enabled: -> { Feature.active?(:tax_center, current_seller) },
             past_payout_period_data: InertiaRails.merge { past_payout_period_data },
             pagination: -> { pagination_data }
           }
  end

  private
    def seller_stats
      @seller_stats ||= UserBalanceStatsService.new(user: current_seller).fetch
    end

    def next_payout_period_data
      seller_stats[:next_payout_period_data]&.merge(
        has_stripe_connect: current_seller.stripe_connect_account.present?
      )
    end

    def processing_payout_periods_data
      seller_stats[:processing_payout_periods_data].map do |item|
        item.merge(has_stripe_connect: current_seller.stripe_connect_account.present?)
      end
    end

    def instant_payout_data
      return nil unless current_seller.instant_payouts_supported?

      {
        payable_amount_cents: current_seller.instantly_payable_unpaid_balance_cents,
        payable_balances: current_seller.instantly_payable_unpaid_balances.sort_by(&:date).reverse.map do |balance|
          {
            id: balance.external_id,
            date: balance.date,
            amount_cents: balance.holding_amount_cents,
          }
        end,
        bank_account_type: current_seller.active_bank_account.bank_account_type,
        bank_name: current_seller.active_bank_account.bank_name,
        routing_number: current_seller.active_bank_account.routing_number,
        account_number: current_seller.active_bank_account.account_number_visual,
      }
    end

    def past_payout_period_data
      past_payouts.map { payout_period_data(current_seller, _1) }
    end

    def past_payouts
      @past_payouts ||= begin
        payouts = current_seller.payments
          .completed
          .displayable
          .order(created_at: :desc)

        page_num = validated_page_num(payouts.count)
        pagy(payouts, page: page_num, limit: PAST_PAYMENTS_PER_PAGE).last
      end
    end

    def pagination_data
      payouts = current_seller.payments
        .completed
        .displayable
        .order(created_at: :desc)

      page_num = validated_page_num(payouts.count)
      pagination, _payouts = pagy(payouts, page: page_num, limit: PAST_PAYMENTS_PER_PAGE)
      PagyPresenter.new(pagination).props
    end

    def validated_page_num(payouts_count)
      total_pages = (payouts_count / PAST_PAYMENTS_PER_PAGE.to_f).ceil
      page_num = params[:page].to_i

      if page_num <= 0
        1
      elsif page_num > total_pages && total_pages != 0
        total_pages
      else
        page_num
      end
    end
end
