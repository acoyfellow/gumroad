# frozen_string_literal: true

class Products::Edit::ShareTabPresenter < Products::Edit::BasePresenter
  def props
    layout_props.merge(product: share_tab_product_props)
  end
end
