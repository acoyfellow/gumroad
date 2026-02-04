# frozen_string_literal: true

class Products::ReceiptController < Products::BaseController
  def edit
    render inertia: "Products/Receipt/Edit", props: Products::ReceiptTabPresenter.new(product: @product, pundit_user:).props
  end

  def update
    should_unpublish = params[:unpublish].present? && @product.published?

    if should_unpublish
      return unpublish_and_redirect_to(edit_product_receipt_path(@product.unique_permalink))
    end

    should_publish = params[:publish].present? && !@product.published?

    begin
      ActiveRecord::Base.transaction do
        update_receipt_attributes
        @product.publish! if should_publish
      end
    rescue ActiveRecord::RecordNotSaved, ActiveRecord::RecordInvalid, Link::LinkInvalid => e
      error_message = @product.errors.full_messages.first || e.message
      return redirect_to edit_product_receipt_path(@product.unique_permalink), alert: error_message, status: :see_other
    end

    check_offer_codes_validity
    if should_publish
      redirect_to edit_product_share_path(@product.unique_permalink), notice: "Published!", status: :see_other
    elsif params[:redirect_to].present?
      redirect_to params[:redirect_to], notice: "Changes saved!", status: :see_other
    else
      redirect_to edit_product_receipt_path(@product.unique_permalink), notice: "Changes saved!", status: :see_other
    end
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
