# frozen_string_literal: true

class Api::Internal::ReceiptPreviewController < Api::Internal::BaseController
  include FetchProductByUniquePermalink

  before_action :authenticate_user!
  before_action :fetch_product_by_unique_permalink

  def index
    e404 if @product.nil? || @product.user != current_seller

    @product.custom_receipt_text = params[:custom_receipt_text]
    @product.custom_view_content_button_text = params[:custom_view_content_button_text]
    preview_purchase = build_preview_purchase

    rendered_html = ApplicationController.renderer.render(
      template: "customer_mailer/receipt",
      layout: "email",
      assigns: {
        chargeable: preview_purchase,
        receipt_presenter: ReceiptPresenter.new(preview_purchase, for_email: false)
      }
    )

    premailer = Premailer::Rails::CustomizedPremailer.new(rendered_html)

    render html: premailer.to_inline_css.html_safe, layout: false
  end

  private
    def build_preview_purchase
      preview_purchase = OpenStruct.new(
        link: @product,
        seller: @product.user,
        created_at: Time.current,
        quantity: 1,
        custom_fields: [],
        formatted_total_display_price_per_unit: MoneyFormatter.format(@product.price_cents, @product.price_currency_type.to_sym, no_cents_if_whole: true, symbol: true),
        shipping_cents: 0,
        displayed_price_currency_type: @product.price_currency_type,
        url_redirect: OpenStruct.new(
          token: "preview_token"
        ),
        displayed_price_cents: @product.price_cents,
        support_email: @product.user.support_or_form_email,
        charged_amount_cents: @product.price_cents,
        external_id_for_invoice: "preview_order_id"
      )

      preview_purchase.unbundled_purchases = [preview_purchase]
      preview_purchase.successful_purchases = [preview_purchase]
      preview_purchase.orderable = preview_purchase

      preview_purchase
    end
end
