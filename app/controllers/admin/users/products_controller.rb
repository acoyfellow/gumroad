# frozen_string_literal: true

class Admin::Users::ProductsController < Admin::Users::BaseController
  include Pagy::Backend
  helper Pagy::UrlHelpers

  before_action :fetch_user

  before_action(only: :index) { @title = "#{@user.display_name} on Gumroad" }

  PRODUCTS_ORDER = "ISNULL(COALESCE(purchase_disabled_at, banned_at, links.deleted_at)) DESC, created_at DESC"
  PRODUCTS_PER_PAGE = 10

  def index
    pagination, products = pagy_countless(
      @user.links.order(Arel.sql(PRODUCTS_ORDER)),
      page: params[:page],
      limit: params[:per_page] || PRODUCTS_PER_PAGE,
      countless_minimal: true
    )

    render inertia: "Admin/Users/Products/Index", props: inertia_props(
      user:     @user.as_json(admin: true, impersonatable: policy([:admin, :impersonators, @user]).create?),
      products: InertiaRails.merge {
                  products.includes(:alive_product_files, :active_integrations).map do |product|
                    product.as_json(
                      admin: true,
                      admins_can_mark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).create? },
                      admins_can_unmark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).destroy? }
                    )
                  end
                },
      pagination:
    )
  end
end
