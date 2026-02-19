# frozen_string_literal: true

class Products::ProductTabPresenter < Products::BasePresenter
  def props
    layout_props.merge(
      taxonomies: Discover::TaxonomyPresenter.new.taxonomies_for_nav,
      ratings: product.rating_stats,
      product: product_props,
    )
  end

  private
    def product_props
      refund_policy = product.find_or_initialize_product_refund_policy
      cancellation_discount = product.cancellation_discount_offer_code

      product_minimal_props.merge(
        description: product.description || "",
        custom_permalink: product.custom_permalink,
        price_cents: product.price_cents,
        suggested_price_cents: product.suggested_price_cents,
        customizable_price: !!product.customizable_price,
        **::ProductPresenter::InstallmentPlanProps.new(product:).props,
        custom_button_text_option: product.custom_button_text_option.presence,
        custom_summary: product.custom_summary,
        custom_view_content_button_text: product.custom_view_content_button_text,
        custom_view_content_button_text_max_length: ::Product::Validations::MAX_VIEW_CONTENT_BUTTON_TEXT_LENGTH,
        custom_receipt_text: product.custom_receipt_text,
        custom_attributes: product.custom_attributes,
        file_attributes: product.file_info_for_product_page.map { { name: _1.to_s, value: _2 } },
        max_purchase_count: product.max_purchase_count,
        quantity_enabled: product.quantity_enabled,
        can_enable_quantity: product.can_enable_quantity?,
        should_show_sales_count: product.should_show_sales_count,
        hide_sold_out_variants: product.hide_sold_out_variants?,
        is_epublication: product.is_epublication?,
        product_refund_policy_enabled: product.product_refund_policy_enabled?,
        refund_policy: {
          allowed_refund_periods_in_days: ::RefundPolicy::ALLOWED_REFUND_PERIODS_IN_DAYS.keys.map do
            { key: _1, value: ::RefundPolicy::ALLOWED_REFUND_PERIODS_IN_DAYS[_1] }
          end,
          max_refund_period_in_days: refund_policy.max_refund_period_in_days,
          fine_print: refund_policy.fine_print,
          fine_print_enabled: refund_policy.fine_print.present?,
          title: refund_policy.title,
        },
        require_shipping: product.require_shipping?,
        integrations: ::Integration::ALL_NAMES.index_with { |name| product.find_integration_by_name(name).as_json },
        variants: variants_data,
        availabilities: availabilities_data,
        shipping_destinations: product.shipping_destinations.alive.map do |sd|
          {
            country_code: sd.country_code,
            one_item_rate_cents: sd.one_item_rate_cents,
            multiple_items_rate_cents: sd.multiple_items_rate_cents,
          }
        end,
        section_ids: product.user.seller_profile_products_sections.filter_map { |s| s.external_id if s.shown_products.include?(product.id) },
        taxonomy_id: product.taxonomy_id&.to_s,
        tags: product.tags.pluck(:name),
        display_product_reviews: product.display_product_reviews,
        is_adult: product.is_adult,
        discover_fee_per_thousand: product.discover_fee_per_thousand,
        custom_domain: product.custom_domain&.domain || "",
        free_trial_enabled: product.free_trial_enabled,
        free_trial_duration_amount: product.free_trial_duration_amount,
        free_trial_duration_unit: product.free_trial_duration_unit,
        should_include_last_post: product.should_include_last_post,
        should_show_all_posts: product.should_show_all_posts,
        block_access_after_membership_cancellation: product.block_access_after_membership_cancellation,
        duration_in_months: product.duration_in_months,
        subscription_duration: product.subscription_duration,
        collaborating_user: collaborating_user_props,
        rich_content: product.rich_content_json,
        covers: product.display_asset_previews.as_json,
        has_same_rich_content_for_all_variants: product.has_same_rich_content_for_all_variants?,
        is_multiseat_license: product.is_multiseat_license,
        call_limitation_info: product.native_type == ::Link::NATIVE_TYPE_CALL && product.call_limitation_info.present? ? {
          minimum_notice_in_minutes: product.call_limitation_info.minimum_notice_in_minutes,
          maximum_calls_per_day: product.call_limitation_info.maximum_calls_per_day,
        } : nil,
        cancellation_discount: cancellation_discount.present? ? {
          discount: cancellation_discount.is_cents? ?
            { type: "fixed", cents: cancellation_discount.amount_cents } :
            { type: "percent", percents: cancellation_discount.amount_percentage },
          duration_in_billing_cycles: cancellation_discount.duration_in_billing_cycles,
        } : nil,
        default_offer_code_id: product.default_offer_code&.external_id,
        default_offer_code: product.default_offer_code ? {
          id: product.default_offer_code.external_id,
          code: product.default_offer_code.code,
          name: product.default_offer_code.name.presence || "",
          discount: product.default_offer_code.discount,
        } : nil,
        public_files: public_files_data,
        audio_previews_enabled: Feature.active?(:audio_previews, product.user),
        community_chat_enabled: Feature.active?(:communities, product.user) ? product.community_chat_enabled? : nil,
      )
    end
end
