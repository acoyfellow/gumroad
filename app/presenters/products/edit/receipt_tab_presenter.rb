# frozen_string_literal: true

module Products
  module Edit
    class ReceiptTabPresenter < BasePresenter
      def props
        {
          **base_props,
          product: {
            **base_props[:product],
          }
        }
      end
    end
  end
end
