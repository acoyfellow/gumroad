# frozen_string_literal: true

class Products::ReceiptController < Products::BaseController
  def edit
    render inertia: "Products/Receipt/Edit", props: {
      product: -> { edit_product_receipt_presenter.edit_product_receipt },
      page_metadata: -> { edit_product_receipt_presenter.edit_product_receipt_metadata },
      receipt_preview_html: -> { ReceiptPreviewRendererService.new(product: @product, custom_receipt_text: params[:custom_receipt_text], custom_view_content_button_text: params[:custom_view_content_button_text], override_existing_text: request.inertia_partial?).perform },
    }
  end

  def update
    product, warning, status, success = Product::UpdateService.new(
      product: @product,
      params: params.require(:product).permit(policy(@product).receipt_tab_permitted_attributes),
      current_seller:,
    ).process(:receipt_tab).values_at(:product, :warning, :status, :success)

    return redirect_to edit_product_receipt_path(product), inertia: inertia_errors(product, model_name: "product"), alert: inertia_alert(product), status: :found unless success

    notice = case status
             when :published then "Published!"
             when :unpublished then "Unpublished!"
             else "Changes saved!"
    end

    redirect_path = permitted_next_url || (status == :published ? edit_product_share_path(product) : edit_product_receipt_path(product))
    redirect_to redirect_path, status: :see_other, **(warning.present? ? { warning: } : { notice: })
  end

  private
    def edit_product_receipt_presenter
      @_edit_product_receipt_presenter ||= ProductPresenter.new(product: @product, pundit_user:)
    end
end
