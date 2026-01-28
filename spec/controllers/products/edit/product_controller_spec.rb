# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe Products::Edit::ProductController, inertia: true do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    it "renders the Products/Edit/Product component with expected props" do
      get :edit, params: { product_id: product.unique_permalink }

      expect(response).to be_successful
      expect(inertia).to render_component("Products/Edit/Product")
      expect(inertia.props.keys).to include(:id, :unique_permalink, :product, :seller)
      expect(inertia.props[:id]).to eq(product.external_id)
      expect(inertia.props[:unique_permalink]).to eq(product.unique_permalink)
      expect(inertia.props[:product]).to be_a(Hash)
      expect(inertia.props[:product][:name]).to eq(product.name)
      expect(inertia.props[:product][:is_published]).to eq(!product.draft && product.alive?)
      expect(inertia.props[:product][:native_type]).to eq(product.native_type)
    end

    context "when not authorized" do
      let(:other_user) { create(:user) }

      before { sign_in other_user }

      it "redirects to product page" do
        get :edit, params: { product_id: product.unique_permalink }
        expect(response).to redirect_to(short_link_path(product))
      end
    end
  end

  describe "PATCH update" do
    let(:params) do
      {
        product_id: product.unique_permalink,
        product: {
          name: "Updated Name",
          description: "Updated Description"
        }
      }
    end

    context "with Inertia request" do
      before { request.headers["X-Inertia"] = "true" }

      it "updates the product and redirects to edit path" do
        patch :update, params: params

        expect(product.reload.name).to eq("Updated Name")
        expect(product.description).to eq("Updated Description")
        expect(response).to redirect_to(edit_product_product_path(product.unique_permalink))
        expect(flash[:notice]).to eq("Your changes have been saved!")
      end
    end

  end
end
