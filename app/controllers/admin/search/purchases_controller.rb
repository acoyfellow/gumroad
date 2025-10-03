# fron

class Admin::Search::PurchasesController < Admin::Search::BaseController
  include Admin::ListPaginatedPurchases

  def index
    super do |pagination, purchases|
      if purchases.one? && params[:page].blank?
        redirect_to admin_purchase_path(purchases.first) && return
      end
    end
  end

  private

    def page_title
      "Purchase results"
    end

    def search_params
      {
        query: params[:query].to_s.strip,
        product_title_query: params[:product_title_query].to_s.strip,
        purchase_status: params[:purchase_status]
      }
    end

    def inertia_template
      "Admin/Search/Purchases/Index"
    end

end
