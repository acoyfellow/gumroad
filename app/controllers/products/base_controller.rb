# frozen_string_literal: true

class Products::BaseController < Sellers::BaseController
  before_action :fetch_product
  before_action :authorize_product
  before_action :set_product_edit_title

  layout "inertia"

  protected
    def check_offer_codes_validity
      invalid_currency_offer_codes = @product.product_and_universal_offer_codes.reject do |offer_code|
        offer_code.is_currency_valid?(@product)
      end.map(&:code)
      invalid_amount_offer_codes = @product.product_and_universal_offer_codes.reject { _1.is_amount_valid?(@product) }.map(&:code)

      all_invalid_offer_codes = (invalid_currency_offer_codes + invalid_amount_offer_codes).uniq

      if all_invalid_offer_codes.any?
        has_currency_issues = invalid_currency_offer_codes.any?
        has_amount_issues = invalid_amount_offer_codes.any?

        if has_currency_issues && has_amount_issues
          issue_description = "#{"has".pluralize(all_invalid_offer_codes.count)} currency mismatches or would discount this product below #{@product.min_price_formatted}"
        elsif has_currency_issues
          issue_description = "#{"has".pluralize(all_invalid_offer_codes.count)} currency #{"mismatch".pluralize(all_invalid_offer_codes.count)} with this product"
        else
          issue_description = "#{all_invalid_offer_codes.count > 1 ? "discount" : "discounts"} this product below #{@product.min_price_formatted}, but not to #{MoneyFormatter.format(0, @product.price_currency_type.to_sym, no_cents_if_whole: true, symbol: true)}"
        end

        flash[:warning] = "The following offer #{"code".pluralize(all_invalid_offer_codes.count)} #{issue_description}: #{all_invalid_offer_codes.join(", ")}. Please update #{all_invalid_offer_codes.length > 1 ? "them or they" : "it or it"} will not work at checkout."
      end
    end

    def publish!
      error_message = nil
      html_error_message = false
      begin
        if @product.user.email.blank?
          error_message = "<span>To publish a product, we need you to have an email. <a href=\"#{settings_main_url}\">Set an email</a> to continue.</span>".html_safe
          html_error_message = true
        else
          @product.publish!
        end
      rescue Link::LinkInvalid, ActiveRecord::RecordInvalid
        error_message = @product.errors.full_messages[0]
      rescue StandardError => e
        Bugsnag.notify(e)
        error_message = "Something broke. We're looking into what happened. Sorry about this!"
      end

      if error_message.present?
        return redirect_back fallback_location: edit_product_product_path(@product.unique_permalink), flash: { alert: error_message, html: html_error_message } # rubocop:disable Style/RedundantReturn
      end
    end

    def unpublish_and_redirect_to(redirect_location)
      @product.unpublish!
      check_offer_codes_validity
      redirect_to redirect_location, notice: "Unpublished!", status: :see_other
    end

    def permitted_redirect_path
      safe_redirect_path(params[:redirect_to]) if params[:redirect_to].present?
    end

    def update_custom_domain
      new_domain = product_permitted_params[:custom_domain]&.strip.presence

      if new_domain.present?
        custom_domain = @product.custom_domain || @product.build_custom_domain
        if custom_domain.domain != new_domain
          custom_domain.domain = new_domain
          custom_domain.verify(allow_incrementing_failed_verification_attempts_count: false)
          custom_domain.save!
        end
      elsif @product.custom_domain.present?
        @product.custom_domain.mark_deleted!
      end
    end

  private
    def set_product_edit_title
      set_meta_tag(title: @product.name)
    end

    def fetch_product
      @product = Link.fetch_leniently(params[:product_id], user: current_seller) || Link.fetch_leniently(params[:product_id])
      raise(ActiveRecord::RecordNotFound) if @product.nil? || @product.deleted_at.present?
    end

    def authorize_product
      authorize @product
    end

    # Extracts the content array from a TipTap description wrapper object
    # TipTap sends: { type: "doc", content: [...nodes...] }
    # Services expect: [...nodes...]
    def extract_rich_content_description(description)
      description.to_h[:content]
    end
end
