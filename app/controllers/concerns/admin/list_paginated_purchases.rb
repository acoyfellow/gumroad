# frozen_string_literal: true

module Admin::ListPaginatedPurchases
  extend ActiveSupport::Concern

  include Pagy::Backend

  RECORDS_PER_PAGE = 25

  private
    def list_paginated_purchases(template:, search_params:)
      service = Admin::Search::PurchasesService.new(**search_params)

      if service.valid?
        purchase_records = service.perform
      else
        flash[:alert] = service.errors.full_messages.to_sentence
        purchase_records = Purchase.none
      end

      pagination, purchases = pagy_countless(
        purchase_records,
        limit: params[:per_page] || RECORDS_PER_PAGE,
        page: params[:page],
        countless_minimal: true
      )

      return redirect_to admin_purchase_path(purchases.first) if purchases.one? && pagination.page == 1

      purchases_props = purchases.map do |purchase|
        Admin::PurchasePresenter.new(purchase).list_props
      end

      respond_to do |format|
        format.html do
          render(
            inertia: template,
            props: { purchases: InertiaRails.merge { purchases_props }, pagination: },
          )
        end
        format.json { render json: { purchases:, pagination: } }
      end
    end
end
