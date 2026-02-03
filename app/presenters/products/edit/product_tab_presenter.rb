# frozen_string_literal: true

class Products::Edit::ProductTabPresenter < Products::Edit::BasePresenter
  def props
    layout_props.merge(product: product_tab_product_props)
  end
end
