# frozen_string_literal: true

class Purchases::InvoiceConfirmationController < ApplicationController
  layout "inertia", only: [:show]

  include RequireInvoiceEmailConfirmation

  before_action :set_purchase, only: [:update]
  before_action :set_noindex_header, only: [:show]
  before_action :require_email_confirmation, only: [:update]

  def show
    render inertia: "Purchases/InvoiceConfirmation/Show"
  end

  def update
    redirect_to generate_invoice_by_buyer_path(@purchase.external_id, email: params[:email]), status: :see_other
  end
end
