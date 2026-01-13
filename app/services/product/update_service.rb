# frozen_string_literal: true

module Product
  class UpdateService
    include Rails.application.routes.url_helpers

    def initialize(product:, params:, current_seller:)
      @product = product
      @params = params
      @current_seller = current_seller
      @notify_customers_link_payload = nil
    end

    def process(intent, disallow_publish: false)
      was_published_before = was_published

      begin
        ActiveRecord::Base.transaction do
          case intent
          when :product_tab
            update_product_tab(disallow_publish: disallow_publish)
          when :content_tab
            update_content_tab
          when :share_tab
            update_share_tab(disallow_publish: disallow_publish)
          when :receipt_tab
            update_receipt_tab
          else
            raise ArgumentError, "Unknown intent: #{intent}"
          end
        end
      rescue ActiveRecord::RecordNotSaved, ActiveRecord::RecordInvalid, Link::LinkInvalid => e
        if intent == :content_tab && @product.errors.details[:custom_fields].present?
          message = "You must add titles to all of your inputs"
        else
          message = @product.errors.full_messages.first
        end
        @product.errors.add(:base, message || e.message)
        return { success: false, status: nil, product: @product }
      rescue => e
        @product.errors.add(:base, "Something broke. We're looking into what happened. Sorry about this!")
        Bugsnag.notify(e)
        return { success: false, status: nil, product: @product }
      end

      invalid_currency_offer_codes = @product.product_and_universal_offer_codes.reject do |offer_code|
        offer_code.is_currency_valid?(@product)
      end.map(&:code)
      invalid_amount_offer_codes = @product.product_and_universal_offer_codes.reject { _1.is_amount_valid?(@product) }.map(&:code)
      all_invalid_offer_codes = (invalid_currency_offer_codes + invalid_amount_offer_codes).uniq

      if all_invalid_offer_codes.present?
        has_currency_issues = invalid_currency_offer_codes.any?
        has_amount_issues = invalid_amount_offer_codes.any?

        if has_currency_issues && has_amount_issues
          issue_description = "#{"has".pluralize(all_invalid_offer_codes.count)} currency mismatches or would discount this product below #{@product.min_price_formatted}"
        elsif has_currency_issues
          issue_description = "#{"has".pluralize(all_invalid_offer_codes.count)} currency #{"mismatch".pluralize(all_invalid_offer_codes.count)} with this product"
        else
          issue_description = "#{all_invalid_offer_codes.count > 1 ? "discount" : "discounts"} this product below #{@product.min_price_formatted}, but not to #{MoneyFormatter.format(0, @product.price_currency_type.to_sym, no_cents_if_whole: true, symbol: true)}"
        end

        return { success: true, status: determine_status(was_published_before), product: @product, warning: "The following offer #{"code".pluralize(all_invalid_offer_codes.count)} #{issue_description}: #{all_invalid_offer_codes.join(", ")}. Please update #{all_invalid_offer_codes.length > 1 ? "them or they" : "it or it"} will not work at checkout." }
      end

      { success: true, status: @notify_customers_link_payload.present? && @product.successful_sales_count.positive? ? :content_updated : determine_status(was_published_before), product: @product, notify_customers_link_payload: @notify_customers_link_payload }
    end

    private
      def update_receipt_tab
        sliced_params = @params.slice(:custom_receipt_text, :custom_view_content_button_text)
        @product.assign_attributes(sliced_params)
        @product.save!
        update_product_publish_status!
      end

      def update_share_tab(disallow_publish: false)
        sliced_params = @params.slice(:taxonomy_id, :display_product_reviews, :is_adult)
        @product.assign_attributes(sliced_params)
        @product.save_tags!(@params[:tags] || [])
        @product.show_in_sections!(@params[:section_ids] || [])
        @product.save!
        update_product_publish_status!(disallow_publish)
      end

      def update_content_tab
        content_params = @params.slice(:rich_content, :files, :variants, :has_same_rich_content_for_all_variants)
        @product.assign_attributes(content_params.slice(:has_same_rich_content_for_all_variants))

        rich_content = content_params[:rich_content] || []
        rich_content_params = [*rich_content]
        content_params[:variants].each { rich_content_params.push(*_1[:rich_content]) } if content_params[:variants].present?
        rich_content_params = rich_content_params.flat_map { _1[:description] = _1.dig(:description, :content) }
        SaveFilesService.perform(@product, content_params, rich_content_params)
        rich_content_update_result = Product::RichContentUpdaterService.new(
          product: @product,
          rich_content_params: rich_content,
          seller: @product.user
        ).perform
        variant_ids_with_updated_rich_content = update_variants
        if rich_content_update_result[:content_updated] || variant_ids_with_updated_rich_content.present?
          @notify_customers_link_payload = { new_email_url: new_email_url(template: "content_updates", product: @product.unique_permalink, bought: rich_content_update_result[:content_updated] ? [@product.unique_permalink] : variant_ids_with_updated_rich_content, only_path: true) }
        end
        Product::SavePostPurchaseCustomFieldsService.new(@product).perform

        @product.is_licensed = @product.has_embedded_license_key?
        unless @product.is_licensed
          @product.is_multiseat_license = false
        end
        @product.save!
        @product.generate_product_files_archives!
        update_product_publish_status!
      end

      def update_product_tab(disallow_publish: false)
        product_params = @params.slice(
          :name, :custom_permalink, :price_currency_type, :price_cents, :customizable_price,
          :suggested_price_cents, :max_purchase_count, :quantity_enabled, :should_show_sales_count,
          :hide_sold_out_variants, :is_epublication, :discover_fee_per_thousand,
          :free_trial_enabled, :free_trial_duration_amount, :free_trial_duration_unit,
          :should_include_last_post, :should_show_all_posts, :block_access_after_membership_cancellation,
          :duration_in_months, :subscription_duration, :require_shipping, :is_multiseat_license,
          :custom_attributes, :file_attributes, :covers, :refund_policy, :product_refund_policy_enabled,
          :seller_refund_policy_enabled, :integrations, :variants,
          :availabilities, :custom_domain, :shipping_destinations, :call_limitation_info,
          :installment_plan, :community_chat_enabled, :description, :cancellation_discount,
          :custom_button_text_option, :custom_summary, :public_files, :default_offer_code_id
        )

        @product.assign_attributes(product_params.except(
          :products,
          :description,
          :cancellation_discount,
          :custom_button_text_option,
          :custom_summary,
          :custom_attributes,
          :file_attributes,
          :covers,
          :refund_policy,
          :product_refund_policy_enabled,
          :seller_refund_policy_enabled,
          :integrations,
          :variants,
          :availabilities,
          :custom_domain,
          :shipping_destinations,
          :call_limitation_info,
          :installment_plan,
          :community_chat_enabled,
          :public_files
        ))

        @product.description = SaveContentUpsellsService.new(seller: @product.user, content: product_params[:description], old_content: @product.description_was).from_html
        @product.skus_enabled = false
        @product.save_custom_button_text_option(product_params[:custom_button_text_option]) unless product_params[:custom_button_text_option].nil?
        @product.save_custom_summary(product_params[:custom_summary]) unless product_params[:custom_summary].nil?
        @product.save_custom_attributes((product_params[:custom_attributes] || []).filter { _1[:name].present? || _1[:description].present? })
        @product.reorder_previews((product_params[:covers] || []).map.with_index.to_h)
        if !@current_seller.account_level_refund_policy_enabled?
          @product.product_refund_policy_enabled = product_params[:product_refund_policy_enabled]
          if product_params[:refund_policy].present? && product_params[:product_refund_policy_enabled]
            @product.find_or_initialize_product_refund_policy.update!(product_params[:refund_policy])
          end
        end
        @product.save_shipping_destinations!(product_params[:shipping_destinations] || []) if @product.is_physical

        if Feature.active?(:cancellation_discounts, @product.user) && (product_params[:cancellation_discount].present? || @product.cancellation_discount_offer_code.present?)
          Product::SaveCancellationDiscountService.new(@product, product_params[:cancellation_discount]).perform
        end

        if @product.native_type === Link::NATIVE_TYPE_COFFEE
          @product.suggested_price_cents = product_params[:variants].map { _1[:price_difference_cents] }.max
        end

        Product::SaveIntegrationsService.perform(@product, product_params[:integrations])
        update_variants
        update_removed_file_attributes
        update_custom_domain
        update_availabilities
        update_call_limitation_info
        update_installment_plan
        update_default_offer_code

        @product.description = SavePublicFilesService.new(resource: @product, files_params: product_params[:public_files], content: @product.description).process
        @product.save!
        toggle_community_chat!(product_params[:community_chat_enabled])
        @product.generate_product_files_archives!
        update_product_publish_status!(disallow_publish)
      end

      def was_published
        !@product.draft && @product.alive?
      end

      def update_product_publish_status!(disallow_publish = false)
        return unless @params.key?(:publish)
        return if @params[:publish] == was_published
        raise Link::LinkInvalid, "You cannot publish this product yet." if disallow_publish && @params[:publish]
        raise Link::LinkInvalid, "<span>To publish a product, we need you to have an email. <a href=\"#{settings_main_url}\">Set an email</a> to continue.</span>" if @params[:publish] && @product.user.email.blank?

        @params[:publish] ? @product.publish! : @product.unpublish!
      end

      def determine_status(was_published_before)
        is_now_published = was_published

        if was_published_before != is_now_published
          is_now_published ? :published : :unpublished
        else
          :saved
        end
      end

      def update_removed_file_attributes
        current = @product.file_info_for_product_page.keys.map(&:to_s)
        updated = (@params[:file_attributes] || []).map { _1[:name] }
        @product.add_removed_file_info_attributes(current - updated)
      end

      def update_variants
        variant_category = @product.variant_categories_alive.first
        variants = @params[:variants] || []
        if variants.any? || @product.is_tiered_membership?
          variant_category_params = variant_category.present? ?
            {
              id: variant_category.external_id,
              name: variant_category.title,
            } :
            { name: @product.is_tiered_membership? ? "Tier" : "Version" }
          Product::VariantsUpdaterService.new(
            product: @product,
            variants_params: [
              {
                **variant_category_params,
                options: variants,
              }
            ],
          ).perform
        elsif variant_category.present?
          Product::VariantsUpdaterService.new(
            product: @product,
            variants_params: [
              {
                id: variant_category.external_id,
                options: nil,
              }
            ],
          ).perform
        else
          []
        end
      end

      def update_custom_domain
        if @params[:custom_domain].present?
          custom_domain = @product.custom_domain || @product.build_custom_domain
          custom_domain.domain = @params[:custom_domain]
          custom_domain.verify(allow_incrementing_failed_verification_attempts_count: false)
          custom_domain.save!
        elsif @params[:custom_domain] == "" && @product.custom_domain.present?
          @product.custom_domain.mark_deleted!
        end
      end

      def update_availabilities
        return unless @product.native_type == Link::NATIVE_TYPE_CALL

        existing_availabilities = @product.call_availabilities
        availabilities_to_keep = []
        (@params[:availabilities] || []).each do |availability_params|
          availability = existing_availabilities.find { _1.id == availability_params[:id] } || @product.call_availabilities.build
          availability.update!(availability_params.except(:id))
          availabilities_to_keep << availability
        end
        (existing_availabilities - availabilities_to_keep).each(&:destroy!)
      end

      def update_call_limitation_info
        return unless @product.native_type == Link::NATIVE_TYPE_CALL

        @product.call_limitation_info.update!(@params[:call_limitation_info])
      end

      def update_installment_plan
        return unless @product.eligible_for_installment_plans?

        if @product.installment_plan && @params[:installment_plan].present?
          @product.installment_plan.assign_attributes(@params[:installment_plan])
          return unless @product.installment_plan.changed?
        end

        @product.installment_plan&.destroy_if_no_payment_options!
        @product.reset_installment_plan

        if @params[:installment_plan].present?
          @product.create_installment_plan!(@params[:installment_plan])
        end
      end

      def update_default_offer_code
        default_offer_code_id = @params[:default_offer_code_id]

        return @product.default_offer_code = nil if default_offer_code_id.blank?

        offer_code = @product.user.offer_codes.alive.find_by_external_id!(default_offer_code_id)

        raise Link::LinkInvalid, "Offer code cannot be expired" if offer_code.inactive?
        raise Link::LinkInvalid, "Offer code must be associated with this product or be universal" unless valid_for_product?(offer_code)

        @product.default_offer_code = offer_code
      rescue ActiveRecord::RecordNotFound
        raise Link::LinkInvalid, "Invalid offer code"
      end

      def valid_for_product?(offer_code)
        offer_code.universal? || @product.offer_codes.where(id: offer_code.id).exists?
      end

      def toggle_community_chat!(enabled)
        return unless Feature.active?(:communities, @current_seller)
        return if [Link::NATIVE_TYPE_COFFEE, Link::NATIVE_TYPE_BUNDLE].include?(@product.native_type)

        @product.toggle_community_chat!(enabled)
      end
  end
end
