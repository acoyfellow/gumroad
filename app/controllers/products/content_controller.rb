# frozen_string_literal: true

class Products::ContentController < Products::BaseController
  def edit
    render inertia: "Products/Content/Edit", props: {
      product: -> { edit_product_content_presenter.edit_product_content },
      existing_files: -> { edit_product_content_presenter.existing_files },
      page_metadata: -> { edit_product_content_presenter.edit_product_content_metadata },
    }
  end

  def update
    product, warning, status, success, notify_customers_link_payload = Product::UpdateService.new(
      product: @product,
      params: params.require(:product).permit(policy(@product).content_tab_permitted_attributes),
      current_seller:,
    ).process(:content_tab).values_at(:product, :warning, :status, :success, :notify_customers_link_payload)

    return redirect_to edit_product_content_path(product), inertia: inertia_errors(product, model_name: "product"), alert: inertia_alert(product), status: :found unless success

    notice = case status
             when :published then "Published!"
             when :unpublished then "Unpublished!"
             else "Changes saved!"
    end

    redirect_path = permitted_next_url || (status == :published ? edit_product_share_path(product) : edit_product_content_path(product))
    flash[:inertia] = { status: "frontend_alert_contents_updated", data: notify_customers_link_payload } if status == :content_updated
    redirect_to redirect_path, status: :see_other, **(warning.present? ? { warning: } : { notice: })
  end

  private
    def edit_product_content_presenter
      @_edit_product_content_presenter ||= ProductPresenter.new(product: @product, pundit_user:)
    end
end
