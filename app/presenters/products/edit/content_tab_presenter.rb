# frozen_string_literal: true

class Products::Edit::ContentTabPresenter < Products::Edit::BasePresenter
  def props
    layout_props.merge(product: content_tab_product_props)
  end
end
