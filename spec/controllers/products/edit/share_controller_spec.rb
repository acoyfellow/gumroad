# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe Products::Edit::ShareController, inertia: true do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    context "when product is published" do
      before { product.publish! }

      it "renders the Products/Edit/Share component with expected props" do
        get :edit, params: { product_id: product.unique_permalink }

        expect(response).to be_successful
        expect(inertia).to render_component("Products/Edit/Share")
        expect(inertia.props.keys).to include(:id, :unique_permalink, :product, :seller)
        expect(inertia.props[:id]).to eq(product.external_id)
        expect(inertia.props[:unique_permalink]).to eq(product.unique_permalink)
        expect(inertia.props[:product]).to be_a(Hash)
        expect(inertia.props[:product][:name]).to eq(product.name)
        expect(inertia.props[:product][:is_published]).to eq(!product.draft && product.alive?)
      end
    end

    context "when product is not published" do
      before { product.update!(draft: true) }

      it "redirects to product or content tab with alert" do
        get :edit, params: { product_id: product.unique_permalink }

        expect(response).to redirect_to(product_edit_content_path(product.unique_permalink))
        expect(flash[:alert]).to include("publish")
      end
    end
  end

  describe "PATCH update" do
    let(:params) do
      {
        product_id: product.unique_permalink,
        product: {
          is_adult: true,
          display_product_reviews: false
        }
      }
    end

    context "with Inertia request" do
      before { request.headers["X-Inertia"] = "true" }

      it "updates the share info and redirects" do
        patch :update, params: params

        expect(response).to redirect_to(product_edit_share_path(product.unique_permalink))
        expect(flash[:notice]).to eq("Your changes have been saved!")
        expect(product.reload.is_adult).to be(true)
        expect(product.display_product_reviews).to be(false)
      end
    end

  end
end
