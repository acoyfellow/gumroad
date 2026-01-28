# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe Products::Edit::ReceiptController, inertia: true do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    it "renders the Products/Edit/Receipt component with expected props" do
      get :edit, params: { product_id: product.unique_permalink }

      expect(response).to be_successful
      expect(inertia).to render_component("Products/Edit/Receipt")
      expect(inertia.props.keys).to include(:id, :unique_permalink, :product, :seller)
      expect(inertia.props[:id]).to eq(product.external_id)
      expect(inertia.props[:unique_permalink]).to eq(product.unique_permalink)
      expect(inertia.props[:product]).to be_a(Hash)
      expect(inertia.props[:product][:name]).to eq(product.name)
      expect(inertia.props[:product][:custom_receipt_text]).to eq(product.custom_receipt_text)
    end
  end

  describe "PATCH update" do
    let(:params) do
      {
        product_id: product.unique_permalink,
        product: {
          custom_receipt_text: "Thanks for buying!",
          custom_view_content_button_text: "Download Now"
        }
      }
    end

    context "with Inertia request" do
      before { request.headers["X-Inertia"] = "true" }

      it "updates the receipt info and redirects" do
        patch :update, params: params

        expect(response).to redirect_to(product_edit_receipt_path(product.unique_permalink))
        expect(flash[:notice]).to eq("Your changes have been saved!")
        expect(product.reload.custom_receipt_text).to eq("Thanks for buying!")
        expect(product.custom_view_content_button_text).to eq("Download Now")
      end
    end

  end
end
