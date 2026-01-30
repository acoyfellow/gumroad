# frozen_string_literal: true

module Products
  module Edit
    class ShareTabPresenter < BasePresenter
      def props
        layout_props.merge(product: share_tab_product_props)
      end
    end
  end
end
