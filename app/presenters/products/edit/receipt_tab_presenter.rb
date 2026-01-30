# frozen_string_literal: true

module Products
  module Edit
    class ReceiptTabPresenter < BasePresenter
      def props
        layout_props.merge(product: receipt_tab_product_props)
      end
    end
  end
end
