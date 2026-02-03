# frozen_string_literal: true

class Products::ShareTabPresenter < Products::BasePresenter
  def props
    layout_props.merge(product: product_props)
  end

  private
    def product_props
      product_minimal_props.merge(
        section_ids: product.user.seller_profile_products_sections.filter_map { |s| s.external_id if s.shown_products.include?(product.id) },
        taxonomy_id: product.taxonomy_id&.to_s,
        tags: product.tags.pluck(:name),
        display_product_reviews: product.display_product_reviews,
        is_adult: product.is_adult,
        custom_domain: product.custom_domain&.domain || "",
      )
    end
end
