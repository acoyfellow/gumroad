# frozen_string_literal: true

module Products
  module Edit
    class ContentTabPresenter < BasePresenter
      def props
        layout_props.merge(product: content_tab_product_props)
      end
    end
  end
end
