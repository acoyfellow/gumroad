# frozen_string_literal: true

module Products
  module Edit
    class ContentTabPresenter < BasePresenter
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
