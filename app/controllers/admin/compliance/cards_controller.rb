# frozen_string_literal: true

class Admin::Compliance::CardsController < Admin::BaseController
  include Admin::ListPaginatedPurchases

  MAX_RESULT_LIMIT = 100

  def refund
    if params[:stripe_fingerprint].blank?
      render json: { success: false }
    else
      purchases = Purchase.not_chargedback_or_chargedback_reversed.paid.where(stripe_fingerprint: params[:stripe_fingerprint]).select(:id)
      purchases.find_each do |purchase|
        RefundPurchaseWorker.perform_async(purchase.id, current_user.id, Refund::FRAUD)
      end

      render json: { success: true }
    end
  end

  private

  def page_title
    "Transaction results"
  end

  def search_params
    params.permit(:transaction_date, :last_4, :card_type, :price, :expiry_date)
          .merge(limit: MAX_RESULT_LIMIT)
          .to_hash
          .symbolize_keys
  end

  def inertia_template
    "Admin/Compliance/Cards/Index"
  end
end
