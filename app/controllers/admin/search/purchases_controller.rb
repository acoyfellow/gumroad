# frozen_string_literal: true

class Admin::Search::PurchasesController < Admin::Search::BaseController
  include Admin::ListPaginatedPurchases

  def index
    @title = params[:query].present? ? "Purchase results for #{params[:query].strip}" : "Purchase results"

    list_paginated_purchases(
      template: "Admin/Search/Purchases/Index",
      search_params: {
        query: params[:query].to_s.strip,
        product_title_query: params[:product_title_query].to_s.strip.presence,
        purchase_status: params[:purchase_status]
      }
    )
  end
end
