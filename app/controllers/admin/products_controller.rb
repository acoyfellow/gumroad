# frozen_string_literal: true

class Admin::ProductsController < Admin::BaseController
  include Admin::FetchProduct

  layout "admin_inertia"

  before_action :fetch_product_by_general_permalink

  def show
    render inertia: "Admin/Products/Show", props: {
      title: @product.name,
      product: @product.as_json(
        admin: true,
        admins_can_mark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).create? },
        admins_can_unmark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).destroy? }
      ),
      user: @product.user.as_json(admin: true, impersonatable: policy([:admin, :impersonators, @product.user]).create?)
    }
  end

  private

    def product_param
      params[:id]
    end
end
