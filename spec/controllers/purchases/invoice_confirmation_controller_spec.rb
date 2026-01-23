# frozen_string_literal: true

require "spec_helper"
require "inertia_rails/rspec"

describe Purchases::InvoiceConfirmationController, type: :controller, inertia: true do
  context "within consumer area" do
    describe "GET show" do
      let(:purchase) { create(:purchase) }

      it "returns success" do
        get :show, params: { purchase_id: purchase.external_id }

        expect(response).to be_successful
        expect(inertia.component).to eq("Purchases/InvoiceConfirmation/Show")
      end
    end

    describe "POST update" do
      let(:purchase) { create(:purchase) }

      it "redirects to invoice page with correct email" do
        post :update, params: { purchase_id: purchase.external_id, email: purchase.email }

        expect(response).to redirect_to(generate_invoice_by_buyer_path(purchase.external_id, email: purchase.email))
      end

      it "redirects back with error for incorrect email" do
        post :update, params: { purchase_id: purchase.external_id, email: "wrong@example.com" }

        expect(response).to redirect_to(purchase_invoice_confirmation_path(purchase.external_id))
        expect(flash[:alert]).to eq("Incorrect email address. Please try again.")
      end

      it "redirects back with warning when email is missing" do
        post :update, params: { purchase_id: purchase.external_id }

        expect(response).to redirect_to(purchase_invoice_confirmation_path(purchase.external_id))
        expect(flash[:warning]).to eq("Please enter the purchase's email address to generate the invoice.")
      end
    end
  end
end
