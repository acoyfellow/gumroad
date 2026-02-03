# frozen_string_literal: true

class Products::ReceiptTabPresenter < Products::BasePresenter
  def props
    layout_props.merge(product: product_props)
  end

  private
    def product_props
      product_minimal_props.merge(
        custom_view_content_button_text: product.custom_view_content_button_text,
        custom_view_content_button_text_max_length: ::Product::Validations::MAX_VIEW_CONTENT_BUTTON_TEXT_LENGTH,
        custom_receipt_text: product.custom_receipt_text,
        custom_receipt_text_max_length: ::Product::Validations::MAX_CUSTOM_RECEIPT_TEXT_LENGTH,
      )
    end
end
