# frozen_string_literal: true

module Admin::FetchPurchase
  private

    def fetch_purchase
      @purchase = purchases_scope.find_by(id: purchase_param) if purchase_param.to_i.to_s == purchase_param
      @purchase ||= purchases_scope.find_by_external_id(purchase_param)
      @purchase ||= purchases_scope.find_by_external_id_numeric(purchase_param.to_i)
      @purchase ||= purchases_scope.find_by_stripe_transaction_id(purchase_param)
    end

    def purchase_param
      params[:purchase_id]
    end

    def purchases_scope
      Purchase.all
    end
end
