# frozen_string_literal: true

module Admin::ListPaginatedPurchases
  extend ActiveSupport::Concern

  include Pagy::Backend

  RECORDS_PER_PAGE = 25

  included do
    layout 'admin_inertia'
  end

  def index
    @title = page_title

    service = Admin::Search::PurchasesService.new(**search_params)

    if service.valid?
      records = service.perform
    else
      flash[:alert] = service.errors.full_messages.to_sentence
      records = Purchase.none
    end

    pagination, purchases = pagy(
      records,
      limit: params[:per_page] || RECORDS_PER_PAGE,
      page: params[:page]
    )

    yield [pagination, purchases] if block_given?

    render inertia: 'Admin/Search/Purchases/Index',
            props: {
              purchases: purchases.includes(
                :price,
                :purchase_refund_policy,
                :seller,
                :subscription,
                :variant_attributes,
                link: [:product_refund_policy, :user]
              ).as_json(admin: true),
              pagination:,
              query: params[:query],
              product_title_query: params[:product_title_query],
              purchase_status: params[:purchase_status]
           }
  end

  private

    def page_title
      raise NotImplementedError, 'must be overriden in subclass'
    end

    def search_params
      raise NotImplementedError, 'must be overriden in subclass'
    end

    def inertia_template
      raise NotImplementedError, 'must be overriden in subclass'
    end
end
