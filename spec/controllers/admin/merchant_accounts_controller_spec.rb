# frozen_string_literal: true

require "spec_helper"
require "shared_examples/admin_base_controller_concern"

describe Admin::MerchantAccountsController do
  render_views

  it_behaves_like "inherits from Admin::BaseController"

  let(:admin_user) { create(:admin_user) }

  before do
    sign_in admin_user
  end

  describe "GET show" do
    context "for merchant accounts of type paypal", :vcr do
      let(:merchant_account) { create :merchant_account_paypal, charge_processor_merchant_id: "B66YJBBNCRW6L" }

      it "returns the email address associated with the paypal account" do
        get :show, params: { id: merchant_account.id }

        expect(response.body).to include("data-page")
        expect(response.body).to include("Admin/MerchantAccounts/Show")

        data_page = response.body.match(/data-page="([^"]+)"/)[1]
        json_object = JSON.parse(CGI.unescapeHTML(data_page))
        props = json_object["props"]

        expect(props["live_attributes"]).to eq({
          "Email" => "sb-byx2u2205460@business.example.com"
        })
      end
    end

    context "for merchant accounts of type stripe", :vcr do
      let(:merchant_account) { create :merchant_account, charge_processor_merchant_id: "acct_19paZxAQqMpdRp2I" }

      it "returns the charges and payouts related flags" do
        get :show, params: { id: merchant_account.id }

        expect(response.body).to include("data-page")
        expect(response.body).to include("Admin/MerchantAccounts/Show")

        data_page = response.body.match(/data-page="([^"]+)"/)[1]
        json_object = JSON.parse(CGI.unescapeHTML(data_page))
        props = json_object["props"]

        expect(props["live_attributes"]).to eq({
          "Charges enabled" => false,
          "Payout enabled" => false,
          "Disabled reason" => "rejected.fraud",
          "Fields needed" => {
            "alternatives" => [],
            "current_deadline" => nil,
            "currently_due" => [
              "individual.address.city",
              "individual.address.line1",
              "individual.address.postal_code",
              "individual.address.state",
              "individual.id_number",
              "individual.nationality"
            ],
            "disabled_reason" => "rejected.fraud",
            "errors" => [],
            "eventually_due" => [
              "individual.address.city",
              "individual.address.line1",
              "individual.address.postal_code",
              "individual.address.state",
              "individual.id_number",
              "individual.nationality"
            ],
            "past_due" => [
              "individual.address.city",
              "individual.address.line1",
              "individual.address.postal_code",
              "individual.address.state",
              "individual.id_number",
              "individual.nationality"
            ],
            "pending_verification" => []
          }
        })
      end
    end
  end
end
