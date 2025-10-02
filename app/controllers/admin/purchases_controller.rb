# frozen_string_literal: true

class Admin::PurchasesController < Admin::BaseController
  include Admin::FetchPurchase

  layout "admin_inertia", only: :show

  before_action :fetch_purchase,
                only: %i[
                  show
                  cancel_subscription
                  refund
                  refund_for_fraud
                  refund_taxes_only
                  resend_receipt
                  sync_status_with_charge_processor
                  block_buyer
                  unblock_buyer
                  undelete
                ]

  def show
    e404 if @purchase.nil?

    @title = "Purchase #{@purchase.id}"

    render inertia: "Admin/Purchases/Show", props: inertia_props(
      purchase: @purchase.as_json(
        admin: true,
        methods: [
          :formatted_shipping_amount,
          :formatted_affiliate_credit_amount,
          :formatted_total_transaction_amount,
          :external_id,
          :external_id_numeric,
          :card_type,
          :card_visual,
          :card_country,
          :ip_address,
          :ip_country,
          :is_preorder_authorization,
          :is_bundle_purchase,
          :is_stripe_charge_processor,
          :stripe_fingerprint,
          :full_name,
          :street_address,
          :city,
          :state,
          :zip_code,
          :country,
          :can_contact,
          :is_gift_sender_purchase,
          :is_gift_receiver_purchase,
          :is_free_trial_purchase,
          :is_deleted_by_buyer,
          :charge_transaction_url
        ],
        include: {
          affiliate: { original: true, only: [:id], include: { affiliate_user: { original: true, only: [:id, :form_email] } } },
          merchant_account: { original: true, only: [:id, :charge_processor_id], methods: [:holder_of_funds] },
          tip: { original: true, only: [:id], methods: [:formatted_value_usd_cents] },
          refunds: { original: true, only: [:id, :user_id, :status, :created_at] },
          email_infos: { original: true, only: [:id, :email_name, :state, :delivered_at, :opened_at, :created_at] },
          product_purchases: { original: true, only: [:id, :url_redirect_id, :url_redirect_external_id, :uses], include: { url_redirect: { original: true, only: [:id, :uses], methods: [:download_page_url] } } },
          url_redirect: { original: true, only: [:id, :download_page_url, :uses] },
          subscription: { original: true, only: [:id, :external_id], methods: [:cancelled_at, :cancelled_by_buyer, :cancelled_by_seller, :ended_at, :failed_at] },
          purchase_custom_fields: { original: true, only: [:id, :name, :value, :type] },
          license: { original: true, only: [:serial] }
        }
      ).merge(
        offer_code: {
          code: @purchase.offer_code.code,
          displayed_amount_off: @purchase.offer_code.displayed_amount_off(@purchase.link.price_currency_type, with_symbol: true)
        },
        can_force_update: @purchase.can_force_update?,
        successful: @purchase.successful?,
        preorder_authorization_successful: @purchase.preorder_authorization_successful?,
        buyer_blocked: @purchase.buyer_blocked?
      ),
      product: @purchase.link.as_json(
        admin: true,
        admins_can_mark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).create? },
        admins_can_unmark_as_staff_picked: ->(product) { policy([:admin, :products, :staff_picked, product]).destroy? }
      ),
      user: @purchase.link.user.as_json(
        admin: true,
        impersonatable: policy([:admin, :impersonators, @purchase.link.user]).create?
      ),
      gift: @purchase.gift.as_json(original: true, only: [:id, :giftee_purchase_id, :gifter_purchase_id, :giftee_email, :gifter_email, :gift_note])
    )
  end

  def cancel_subscription
    if @purchase.subscription
      @purchase.subscription.cancel!(by_seller: params[:by_seller] == "true", by_admin: true)
      render json: { success: true }
    else
      render json: { success: false }
    end
  end

  def refund
    if @purchase.refund_and_save!(current_user.id)
      render json: { success: true }
    else
      render json: { success: false }
    end
  end

  def refund_for_fraud
    if @purchase.refund_for_fraud_and_block_buyer!(current_user.id)
      render json: { success: true }
    else
      render json: { success: false }
    end
  end

  def refund_taxes_only
    e404 if @purchase.nil?

    if @purchase.refund_gumroad_taxes!(refunding_user_id: current_user.id, note: params[:note], business_vat_id: params[:business_vat_id])
      render json: { success: true }
    else
      render json: { success: false, message: @purchase.errors.full_messages.presence&.to_sentence || "No refundable taxes available" }
    end
  end

  def resend_receipt
    if @purchase
      if params[:resend_receipt][:email_address].present?
        @purchase.email = params[:resend_receipt][:email_address]
        @purchase.save!

        user = User.alive.find_by(email: @purchase.email)
        @purchase.attach_to_user_and_card(user, nil, nil) if user
      end

      @purchase.resend_receipt
      render json: { success: true }
    else
      render json: { success: false }
    end
  end

  def sync_status_with_charge_processor
    @purchase.sync_status_with_charge_processor(mark_as_failed: true)
  end

  def block_buyer
    @purchase.block_buyer!(blocking_user_id: current_user.id)
    render json: { success: true }
  rescue => e
    render json: { success: false, message: e.message }
  end

  def unblock_buyer
    if @purchase.buyer_blocked?
      @purchase.unblock_buyer!

      comment_content = "Buyer unblocked by Admin (#{current_user.email})"
      @purchase.comments.create!(content: comment_content, comment_type: "note", author_id: current_user.id)

      if @purchase.purchaser.present?
        @purchase.purchaser.comments.create!(content: comment_content,
                                             comment_type: "note",
                                             author: current_user,
                                             purchase: @purchase)
      end
    end

    render json: { success: true }
  rescue StandardError => e
    render json: { success: false, message: e.message }
  end

  def undelete
    e404 if @purchase.nil?

    begin
      if @purchase.is_deleted_by_buyer?
        @purchase.update!(is_deleted_by_buyer: false)

        comment_content = "Purchase undeleted by Admin (#{current_user.email})"
        @purchase.comments.create!(content: comment_content, comment_type: "note", author_id: current_user.id)

        if @purchase.purchaser.present?
          @purchase.purchaser.comments.create!(content: comment_content,
                                               comment_type: "note",
                                               author: current_user,
                                               purchase: @purchase)
        end
      end

      render json: { success: true }
    rescue StandardError => e
      render json: { success: false, message: e.message }
    end
  end

  def update_giftee_email
    new_giftee_email = params[:update_giftee_email][:giftee_email]
    gift = Gift.find_by(gifter_purchase_id: purchase_param)

    if gift.present? && new_giftee_email != gift.giftee_email
      giftee_purchase = Purchase.find_by(id: gift.giftee_purchase_id)
      if giftee_purchase.present?
        gift.update!(giftee_email: new_giftee_email)
        giftee_purchase.update!(email: new_giftee_email)

        giftee_purchase.resend_receipt
        redirect_to [:admin, Purchase.find_by(id: purchase_param)]
      else
        render json: {
          success: false,
          message: "This gift is missing a giftee purchase. Please ask an engineer to generate one with script here: https://github.com/gumroad/web/issues/17248#issuecomment-784478299",
        }
      end
    end
  end

  private
    def purchase_param
      params[:id]
    end

    def purchases_scope
      return super unless action_name == "show"

      Purchase.includes(
        :merchant_account,
        :tip,
        :refunds,
        :email_infos,
        :product_purchases,
        :url_redirect,
        :subscription,
        :offer_code,
        :purchase_custom_fields,
        :license,
        :gift_given,
        :gift_received,
        affiliate: { affiliate_user: :form_email }
      )
    end
end
