# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe Products::Edit::ContentController, inertia: true do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    it "renders the Products/Edit/Content component" do
      get :edit, params: { id: product.unique_permalink }

      expect(response).to be_successful
      expect(inertia).to render_component("Products/Edit/Content")
      expect(inertia.props).to include(:product, :id, :unique_permalink)
    end
  end

  describe "PATCH update" do
    let(:params) do
      {
        id: product.unique_permalink,
        rich_content: [{ title: "New Page", description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] } }]
      }
    end

    it "updates the product content and redirects" do
      patch :update, params: params

      expect(response).to redirect_to(products_edit_content_path(id: product.unique_permalink))
      expect(flash[:notice]).to eq("Your changes have been saved!")
      expect(product.reload.rich_contents.count).to eq(1)
    end
  end
end
