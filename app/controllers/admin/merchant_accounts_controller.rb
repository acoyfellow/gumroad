# frozen_string_literal: true

class Admin::MerchantAccountsController < Admin::BaseController
  before_action :set_merchant_account, only: [:show]

  layout 'admin_inertia', only: :show

  before_action(only: :show) { @title = "Merchant Account #{@merchant_account.id}" }

  def show
    render inertia: "Admin/MerchantAccounts/Show",
           props: {
             merchant_account: @merchant_account.as_json(
               methods: [
                 :external_id,
                 :holder_of_funds,
                 :country_name,
                 :stripe_account_url
               ]
             ),
             live_attributes:
           }
  end

  private
    def set_merchant_account
      @merchant_account = MerchantAccount.where(id: params[:id])
                            .or(
                              MerchantAccount.where(charge_processor_merchant_id: params[:id])
                            ).first
      e404 unless @merchant_account.present?
    end

    def live_attributes
      return {} unless @merchant_account.charge_processor_merchant_id?

      if @merchant_account.stripe_charge_processor?
        stripe_account = Stripe::Account.retrieve(@merchant_account.charge_processor_merchant_id)
        {
          "Charges enabled" => stripe_account.charges_enabled,
          "Payout enabled" => stripe_account.payouts_enabled,
          "Disabled reason" => stripe_account.requirements.disabled_reason,
          "Fields needed" => stripe_account.requirements.as_json
        }
      elsif @merchant_account.paypal_charge_processor? && @merchant_account.paypal_account_details.present?
        {
          "Email" => @merchant_account.paypal_account_details["primary_email"]
        }
      end
    end
end
