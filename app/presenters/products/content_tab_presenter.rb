# frozen_string_literal: true

class Products::ContentTabPresenter < Products::BasePresenter
  def props
    layout_props.merge(product: product_props)
  end

  private
    def product_props
      product_minimal_props.merge(
        id: product.external_id,
        description: product.description || "",
        rich_content: product.rich_content_json,
        variants: variants_data,
        has_same_rich_content_for_all_variants: product.has_same_rich_content_for_all_variants?,
        is_multiseat_license: product.is_multiseat_license,
      )
    end
end
