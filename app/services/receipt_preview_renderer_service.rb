# frozen_string_literal: true

class ReceiptPreviewRendererService
  def initialize(product:, custom_receipt_text: nil, custom_view_content_button_text: nil, override_existing_text: false)
    @product = product
    @custom_receipt_text = custom_receipt_text
    @custom_view_content_button_text = custom_view_content_button_text
    @override_existing_text = override_existing_text
  end

  def perform
    @product.custom_receipt_text = @custom_receipt_text if @override_existing_text
    @product.custom_view_content_button_text = @custom_view_content_button_text if @override_existing_text

    purchase_preview = build_purchase_preview

    unless purchase_preview.valid?
      return "<div>Error loading receipt preview</div>".html_safe
    end

    rendered_html = ApplicationController.renderer.render(
      template: "customer_mailer/receipt",
      layout: "email",
      assigns: {
        chargeable: purchase_preview,
        receipt_presenter: ReceiptPresenter.new(purchase_preview, for_email: false)
      }
    )

    Premailer::Rails::CustomizedPremailer.new(rendered_html).to_inline_css.html_safe
  end

  private
    def build_purchase_preview
      price_cents = @product.price_cents || 0

      purchase_preview = PurchasePreview.new(
        link: @product,
        seller: @product.user,
        created_at: Time.current,
        quantity: 1,
        custom_fields: [],
        formatted_total_display_price_per_unit: MoneyFormatter.format(price_cents, @product.price_currency_type.to_sym, no_cents_if_whole: true, symbol: true),
        shipping_cents: 0,
        displayed_price_currency_type: @product.price_currency_type,
        url_redirect: OpenStruct.new(token: "preview_token"),
        displayed_price_cents: price_cents,
        support_email: @product.user.support_or_form_email,
        charged_amount_cents: price_cents,
        external_id_for_invoice: "preview_order_id"
      )

      purchase_preview.unbundled_purchases = [purchase_preview]
      purchase_preview.successful_purchases = [purchase_preview]
      purchase_preview.orderable = purchase_preview

      purchase_preview
    end
end
