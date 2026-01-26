# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe Products::Edit::ReceiptController, inertia: true do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    it "renders the Products/Edit/Receipt component" do
      get :edit, params: { id: product.unique_permalink }

      expect(response).to be_successful
      expect(inertia).to render_component("Products/Edit/Receipt")
      expect(inertia.props).to include(:product, :id, :unique_permalink)
    end
  end

  describe "PATCH update" do
    let(:params) do
      {
        id: product.unique_permalink,
        custom_receipt_text: "Thanks for buying!",
        custom_view_content_button_text: "Download Now"
      }
    end

    it "updates the receipt info and redirects" do
      patch :update, params: params

      expect(response).to redirect_to(products_edit_receipt_path(id: product.unique_permalink))
      expect(flash[:notice]).to eq("Your changes have been saved!")
      expect(product.reload.custom_receipt_text).to eq("Thanks for buying!")
      expect(product.custom_view_content_button_text).to eq("Download Now")
    end
  end
end
