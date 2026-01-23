# frozen_string_literal: true

class Purchases::InvoicesController < ApplicationController
  layout "inertia", only: [:new]

  include RequireInvoiceEmailConfirmation

  before_action :set_purchase
  before_action :set_noindex_header, only: [:new]
  before_action :require_email_confirmation
  before_action :check_for_successful_purchase_for_vat_refund, only: [:create]
  before_action :set_chargeable, only: [:create, :new]

  def new
    render inertia: "Purchases/Invoices/New", props: {
      form_data: -> { invoice_presenter.invoice_generation_form_data_props },
      form_metadata: -> { invoice_presenter.invoice_generation_form_metadata_props },
      invoice_file_url: InertiaRails.optional { session.delete("invoice_file_url_#{@purchase.external_id}") },
    }
  end

  def create
    address_fields = create_permitted_params[:address_fields]
    address_fields[:country] = ISO3166::Country[create_permitted_params[:address_fields][:country_code]]&.common_name
    business_vat_id = create_permitted_params[:vat_id] if is_vat_id_valid?(create_permitted_params[:vat_id])
    invoice_presenter = InvoicePresenter.new(@chargeable, address_fields:, additional_notes: create_permitted_params[:additional_notes]&.strip, business_vat_id:)

    begin
      @chargeable.refund_gumroad_taxes!(refunding_user_id: logged_in_user&.id, note: address_fields.to_json, business_vat_id:) if business_vat_id
      pdf = PDFKit.new(render_to_string(locals: { invoice_presenter: }, formats: [:pdf], layout: false), page_size: "Letter").to_pdf
      session["invoice_file_url_#{@purchase.external_id}"] = @chargeable.upload_invoice_pdf(pdf).presigned_url(:get, expires_in: SignedUrlHelper::SIGNED_S3_URL_VALID_FOR_MAXIMUM.to_i)
      redirect_to generate_invoice_by_buyer_path(@purchase.external_id, email: params[:email]), status: :see_other, notice: tax_refund_message(business_vat_id)
      rescue StandardError => e
        Rails.logger.error("Chargeable #{@chargeable.class.name} (#{@chargeable.external_id}) invoice generation failed due to: #{e.inspect}")
        Rails.logger.error(e.message)
        Rails.logger.error(e.backtrace.join("\n"))

        redirect_to generate_invoice_by_buyer_path(@purchase.external_id, email: create_permitted_params[:email]), status: :see_other, alert: "Sorry, something went wrong."
    end
  end

  private
    def invoice_presenter
      @_invoice_presenter ||= InvoicePresenter.new(@chargeable)
    end

    def create_permitted_params
      params.permit(:email, :vat_id, :additional_notes, address_fields: [:full_name, :street_address, :city, :state, :zip_code, :country_code])
    end

    def set_chargeable
      @chargeable = Charge::Chargeable.find_by_purchase_or_charge!(purchase: @purchase)
    end

    def check_for_successful_purchase_for_vat_refund
      return if params["vat_id"].blank? || @purchase.successful?

      flash[:alert] = "Your purchase has not been completed by PayPal yet. Please try again soon."
      redirect_to generate_invoice_by_buyer_path(@purchase.external_id, email: params[:email]), status: :see_other
    end

    def is_vat_id_valid?(raw_vat_id)
      return false unless raw_vat_id.present?
      country_code, state_code = @chargeable.purchase_sales_tax_info&.values_at(:country_code, :state_code) || [nil, nil]
      RegionalVatIdValidationService.new(raw_vat_id, country_code:, state_code:).process
    end

    def tax_refund_message(business_vat_id)
      message = "The invoice will be downloaded automatically."
      return message unless business_vat_id

      tax_info = @chargeable.purchase_sales_tax_info
      return message unless tax_info.present?

      country_code = tax_info.country_code

      notice = if Compliance::Countries::GST_APPLICABLE_COUNTRY_CODES.include?(country_code) ||
                   Compliance::Countries::IND.alpha2 == country_code
        "GST has also been refunded."
      elsif Compliance::Countries::CAN.alpha2 == country_code
        "QST has also been refunded."
      elsif Compliance::Countries::MYS.alpha2 == country_code
        "Service tax has also been refunded."
      elsif Compliance::Countries::JPN.alpha2 == country_code
        "CT has also been refunded."
      else
        "VAT has also been refunded."
      end

      "#{message} #{notice}"
    end

    def set_title
      @title = "Generate invoice"
    end
end
