# frozen_string_literal: true

module Products
  module Edit
    class BasePresenter
      include Rails.application.routes.url_helpers
      include ProductsHelper
      include CurrencyHelper
      include PreorderHelper

      attr_reader :product, :pundit_user

      def initialize(product:, pundit_user:)
        @product = product
        @pundit_user = pundit_user
      end

      # Top-level props required by the shared layout (no product; each tab adds its own product).
      def layout_props
        {
          id: product.external_id,
          unique_permalink: product.unique_permalink,
          seller: UserPresenter.new(user: product.user).author_byline_props,
          existing_files: legacy_presenter.existing_files,
          ai_generated: false,
          currency_type: product.price_currency_type,
          taxonomies: Discover::TaxonomyPresenter.new.taxonomies_for_nav,
          earliest_membership_price_change_date: ::BaseVariant::MINIMUM_DAYS_TIL_EXISTING_MEMBERSHIP_PRICE_CHANGE.days.from_now.in_time_zone(product.user.timezone).iso8601,
          available_countries: ::ShippingDestination::Destinations.shipping_countries.map { { code: _1[0], name: _1[1] } },
          google_client_id: ::GlobalConfig.get("GOOGLE_CLIENT_ID"),
          google_calendar_enabled: Feature.active?(:google_calendar_link, product.user),
          cancellation_discounts_enabled: Feature.active?(:cancellation_discounts, product.user),
          thumbnail: product.thumbnail&.alive&.as_json,
          refund_policies: product.user.product_refund_policies.for_visible_and_not_archived_products.where.not(product_id: product.id).order(updated_at: :desc).select("refund_policies.*", "links.name").as_json,
          is_tiered_membership: product.is_tiered_membership,
          is_listed_on_discover: product.recommendable?,
          is_physical: product.is_physical,
          profile_sections: product.user.seller_profile_products_sections.map { { id: _1.external_id, header: _1.header || "", product_names: _1.product_names, default: _1.add_new_products } },
          sales_count_for_inventory: product.max_purchase_count? ? product.sales_count_for_inventory : 0,
          successful_sales_count: product.successful_sales_count,
          ratings: product.rating_stats,
          aws_key: AWS_ACCESS_KEY,
          s3_url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}",
          seller_refund_policy_enabled: product.user.account_level_refund_policy_enabled?,
          seller_refund_policy: {
            title: product.user.refund_policy.title,
            fine_print: product.user.refund_policy.fine_print,
          },
          custom_domain_verification_status:,
        }
      end

      # Minimal product keys required by the layout (name, is_published, files, native_type).
      def product_minimal_props
        {
          name: product.name,
          is_published: !product.draft && product.alive?,
          files: files_data,
          native_type: product.native_type,
        }
      end

      # Full product hash for the Product tab only.
      def product_tab_product_props
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
          custom_receipt_text_max_length: ::Product::Validations::MAX_CUSTOM_RECEIPT_TEXT_LENGTH,
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

      # Product hash for the Content tab only (content-related fields + minimal).
      def content_tab_product_props
        product_minimal_props.merge(
          id: product.external_id,
          description: product.description || "",
          rich_content: product.rich_content_json,
          variants: variants_data,
          has_same_rich_content_for_all_variants: product.has_same_rich_content_for_all_variants?,
          is_multiseat_license: product.is_multiseat_license,
        )
      end

      # Product hash for the Receipt tab only (receipt-related fields + minimal).
      def receipt_tab_product_props
        product_minimal_props.merge(
          custom_view_content_button_text: product.custom_view_content_button_text,
          custom_view_content_button_text_max_length: ::Product::Validations::MAX_VIEW_CONTENT_BUTTON_TEXT_LENGTH,
          custom_receipt_text: product.custom_receipt_text,
          custom_receipt_text_max_length: ::Product::Validations::MAX_CUSTOM_RECEIPT_TEXT_LENGTH,
        )
      end

      # Product hash for the Share tab only (share-related fields + minimal).
      def share_tab_product_props
        product_minimal_props.merge(
          section_ids: product.user.seller_profile_products_sections.filter_map { |s| s.external_id if s.shown_products.include?(product.id) },
          taxonomy_id: product.taxonomy_id&.to_s,
          tags: product.tags.pluck(:name),
          display_product_reviews: product.display_product_reviews,
          is_adult: product.is_adult,
          custom_domain: product.custom_domain&.domain || "",
        )
      end

      private
        def legacy_presenter
          @legacy_presenter ||= ::ProductPresenter.new(product:, pundit_user:)
        end

        def custom_domain_verification_status
          legacy_presenter.send(:custom_domain_verification_status)
        end

        def collaborating_user_props
          collaborator = product.collaborator_for_display
          collaborator.present? ? UserPresenter.new(user: collaborator).author_byline_props : nil
        end

        def files_data
          product.product_files.alive.in_order.includes(:alive_subtitle_files).map(&:as_json)
        end

        def variants_data
          product.alive_variants.in_order.map do |variant|
            props = {
              id: variant.external_id,
              name: variant.name || "",
              description: variant.description || "",
              max_purchase_count: variant.max_purchase_count,
              integrations: ::Integration::ALL_NAMES.index_with { |name| variant.find_integration_by_name(name).present? },
              rich_content: variant.rich_content_json,
              sales_count_for_inventory: variant.max_purchase_count? ? variant.sales_count_for_inventory : 0,
              active_subscribers_count: variant.active_subscribers_count,
            }
            props[:duration_in_minutes] = variant.duration_in_minutes if product.native_type == ::Link::NATIVE_TYPE_CALL
            if product.native_type == ::Link::NATIVE_TYPE_MEMBERSHIP
              props.merge!(
                customizable_price: !!variant.customizable_price,
                recurrence_price_values: variant.recurrence_price_values(for_edit: true),
                apply_price_changes_to_existing_memberships: variant.apply_price_changes_to_existing_memberships?,
                subscription_price_change_effective_date: variant.subscription_price_change_effective_date,
                subscription_price_change_message: variant.subscription_price_change_message,
              )
            else
              props[:price_difference_cents] = variant.price_difference_cents
            end
            props
          end
        end

        def availabilities_data
          return [] unless product.native_type == Link::NATIVE_TYPE_CALL

          product.call_availabilities.map do |availability|
            {
              id: availability.external_id,
              start_time: availability.start_time.iso8601,
              end_time: availability.end_time.iso8601,
            }
          end
        end

        def public_files_data
          product.alive_public_files.attached.map { PublicFilePresenter.new(public_file: _1).props }
        end
    end
  end
end
