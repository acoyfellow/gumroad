# frozen_string_literal: true

module Products
  module Edit
    class ProductTabPresenter < BasePresenter
      def props
        {
          **base_props,
          product: {
            **base_props[:product],
            # Additional tab-specific overrides if any
          }
        }
      end
    end
  end
end
