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
        description: product.description || "",
        price_cents: product.price_cents,
        suggested_price_cents: product.suggested_price_cents,
        customizable_price: !!product.customizable_price,
        covers: product.display_asset_previews.as_json,
        variants: variants_data,
        max_purchase_count: product.max_purchase_count,
        quantity_enabled: product.quantity_enabled,
        should_show_sales_count: product.should_show_sales_count,
        hide_sold_out_variants: product.hide_sold_out_variants?,
        custom_button_text_option: product.custom_button_text_option.presence,
        custom_summary: product.custom_summary,
        custom_attributes: product.custom_attributes,
        free_trial_enabled: product.free_trial_enabled,
        public_files: public_files_data,
        audio_previews_enabled: Feature.active?(:audio_previews, product.user),
        refund_policy: {
          allowed_refund_periods_in_days: ::RefundPolicy::ALLOWED_REFUND_PERIODS_IN_DAYS.keys.map do
            { key: _1, value: ::RefundPolicy::ALLOWED_REFUND_PERIODS_IN_DAYS[_1] }
          end,
          max_refund_period_in_days: product.find_or_initialize_product_refund_policy.max_refund_period_in_days,
          fine_print: product.find_or_initialize_product_refund_policy.fine_print,
          title: product.find_or_initialize_product_refund_policy.title,
        },
      )
    end
end
