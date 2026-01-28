# frozen_string_literal: true

module Products
  module Edit
    class ShareController < BaseController
      before_action :ensure_published_for_share, only: [:edit]

      def edit
        render inertia: "Products/Edit/Share", props: Products::Edit::ShareTabPresenter.new(product: @product, pundit_user:).props
      end

      def update
        begin
          ActiveRecord::Base.transaction do
            update_share_attributes
          end
        rescue ActiveRecord::RecordNotSaved, ActiveRecord::RecordInvalid, Link::LinkInvalid => e
          error_message = @product.errors.full_messages.first || e.message
          flash[:alert] = error_message
          return redirect_back fallback_location: product_edit_share_path(@product.external_id)
        end

        flash[:notice] = "Your changes have been saved!"
        check_offer_codes_validity

        redirect_to product_edit_share_path(@product.unique_permalink)
      end

      private

        def ensure_published_for_share
          return if !@product.draft && @product.alive?

          flash[:alert] = "Not yet! You've got to publish your awesome product before you can share it with your audience and the world."
          redirect_path = @product.native_type == Link::NATIVE_TYPE_COFFEE ? edit_product_product_path(@product.unique_permalink) : product_edit_content_path(@product.unique_permalink)
          redirect_to redirect_path
        end

        def update_share_attributes
          @product.assign_attributes(product_permitted_params.except(:tags))
          @product.save_tags!(product_permitted_params[:tags] || [])
          update_custom_domain if product_permitted_params.key?(:custom_domain)
          @product.save!
        end

        def update_custom_domain
          if product_permitted_params[:custom_domain].present?
            custom_domain = @product.custom_domain || @product.build_custom_domain
            custom_domain.domain = product_permitted_params[:custom_domain]
            custom_domain.verify(allow_incrementing_failed_verification_attempts_count: false)
            custom_domain.save!
          elsif product_permitted_params[:custom_domain] == "" && @product.custom_domain.present?
            @product.custom_domain.mark_deleted!
          end
        end

        def product_permitted_params
          params.require(:product).permit(policy(@product).share_tab_permitted_attributes)
        end
    end
  end
end
