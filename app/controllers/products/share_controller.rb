# frozen_string_literal: true

class Products::ShareController < Products::BaseController
  before_action :redirect_if_unpublished, only: [:edit]

  def edit
    render inertia: "Products/Share/Edit", props: {
      product: -> { edit_product_share_presenter.edit_product_share },
      page_metadata: -> { edit_product_share_presenter.edit_product_share_metadata },
    }
  end

  def update
    product, warning, status, success = Product::UpdateService.new(
      product: @product,
      params: params.require(:product).permit(policy(@product).share_tab_permitted_attributes),
      current_seller:,
    ).process(:share_tab, disallow_publish: true).values_at(:product, :warning, :status, :success)

    return redirect_to edit_product_share_path(product), inertia: inertia_errors(product, model_name: "product"), alert: inertia_alert(product), status: :found unless success

    notice = case status
             when :unpublished then "Unpublished!"
             else "Changes saved!"
    end

    default_path = status == :unpublished ? (product.native_type == Link::NATIVE_TYPE_COFFEE ? edit_product_path(product) : edit_product_content_path(product)) : edit_product_share_path(product)
    redirect_path = permitted_next_url || default_path

    redirect_to redirect_path, status: :see_other, **(warning.present? ? { warning: } : { notice: })
  end

  private
    def edit_product_share_presenter
      @_edit_product_share_presenter ||= ProductPresenter.new(product: @product, pundit_user:)
    end

    def redirect_if_unpublished
      redirect_to edit_product_path(@product), warning: "Not yet! You've got to publish your awesome product before you can share it with your audience and the world.", status: :see_other unless @product.published?
    end
end
