# frozen_string_literal: true

class Admin::ProductsController < Admin::BaseController
  include Admin::FetchProduct

  before_action :fetch_product_by_general_permalink

  def show
    @title = @product.name

    render inertia: "Admin/Products/Show", legacy_template: "admin/links/show", props: {
      product: @product.as_json(
        admin: true,
        admins_can_mark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).create? },
        admins_can_unmark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).destroy? }
      ),
      user: Admin::UserPresenter::Card.new(
        user: @product.user,
        impersonatable: policy([:admin, :impersonators, @product.user]).create?
      ).props
    }
  end

  private
    def product_param
      params[:id]
    end
end
