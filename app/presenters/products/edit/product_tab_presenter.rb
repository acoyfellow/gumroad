# frozen_string_literal: true

module Products
  module Edit
    class ProductTabPresenter < BasePresenter
      def props
        layout_props.merge(product: product_tab_product_props)
      end
    end
  end
end
