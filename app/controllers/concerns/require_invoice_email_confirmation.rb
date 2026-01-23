# frozen_string_literal: true

module RequireInvoiceEmailConfirmation
  extend ActiveSupport::Concern

  private
    def require_email_confirmation
      return if ActiveSupport::SecurityUtils.secure_compare(@purchase.email, params[:email].to_s)

      if params[:email].blank?
        flash[:warning] = "Please enter the purchase's email address to generate the invoice."
      else
        flash[:alert] = "Incorrect email address. Please try again."
      end

      redirect_to purchase_invoice_confirmation_path(@purchase.external_id)
    end
end
