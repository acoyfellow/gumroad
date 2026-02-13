# frozen_string_literal: true

class Products::MainController < Products::BaseController
  def edit
    render inertia: "Products/Edit", props: {
      product: -> { edit_product_main_presenter.edit_product },
      page_metadata: edit_product_main_presenter.edit_product_metadata,
    }
  end

  def update
    product, warning, status, success = Product::UpdateService.new(
      product: @product,
      params: params.require(:product).permit(policy(@product).product_tab_permitted_attributes),
      current_seller:,
    ).process(:product_tab, disallow_publish: true).values_at(:product, :warning, :status, :success)

    return redirect_to edit_product_path(product), inertia: inertia_errors(product, model_name: "product"), alert: inertia_alert(product) unless success

    notice = case status
             when :published then "Published!"
             when :unpublished then "Unpublished!"
             else "Changes saved!"
    end

    default_path = (status == :saved && !product.alive? && product.native_type != Link::NATIVE_TYPE_COFFEE) ? edit_product_content_path(product) : edit_product_path(product)
    redirect_to permitted_next_url || default_path, status: :see_other, **(warning.present? ? { warning: } : { notice: })
  end

  private
    def edit_product_main_presenter
      @_edit_product_main_presenter ||= ProductPresenter.new(product: @product, pundit_user:, ai_generated: params[:ai_generated] == "true")
    end
end
