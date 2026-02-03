# frozen_string_literal: true

class Products::Edit::ReceiptTabPresenter < Products::Edit::BasePresenter
  def props
    layout_props.merge(product: receipt_tab_product_props)
  end
end
