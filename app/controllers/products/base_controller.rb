# frozen_string_literal: true

class Products::BaseController < Sellers::BaseController
  include FetchProductByUniquePermalink

  skip_before_action :check_suspended, only: [:edit]

  before_action :fetch_product_by_unique_permalink, only: [:edit, :update]
  before_action :authorize_product
  before_action :redirect_if_bundle, only: [:edit]
  before_action :set_default_page_title

  layout "inertia"

  private
    def permitted_next_url
      params.permit(:next_url)[:next_url].presence
    end

    def authorize_product
      authorize @product
    end

    def redirect_if_bundle
      redirect_to edit_bundle_product_path(@product.external_id) if @product.is_bundle?
    end

    def inertia_alert(product)
      product.errors[:base]&.first
    end

    def set_default_page_title
      set_meta_tag(title: @product.name)
    end
end
