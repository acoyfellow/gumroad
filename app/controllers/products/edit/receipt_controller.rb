# frozen_string_literal: true

module Products
  module Edit
    class ReceiptController < BaseController
      def edit
        render inertia: "Products/Edit/Receipt", props: Products::Edit::ReceiptTabPresenter.new(product: @product, pundit_user:).props
      end

      def update
        begin
          ActiveRecord::Base.transaction do
            update_receipt_attributes
          end
        rescue ActiveRecord::RecordNotSaved, ActiveRecord::RecordInvalid, Link::LinkInvalid => e
          error_message = @product.errors.full_messages.first || e.message
          flash[:alert] = error_message
          return redirect_back fallback_location: product_edit_receipt_path(@product.external_id)
        end

        flash[:notice] = "Your changes have been saved!"
        check_offer_codes_validity

        redirect_to product_edit_receipt_path(@product.unique_permalink)
      end

      private

        def update_receipt_attributes
          @product.assign_attributes(product_permitted_params.except(:custom_domain))
          @product.save!
        end

        def product_permitted_params
          params.require(:product).permit(policy(@product).receipt_tab_permitted_attributes)
        end
    end
  end
end
