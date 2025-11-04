# frozen_string_literal: true

require "spec_helper"
require "shared_examples/admin_base_controller_concern"
require "inertia_rails/rspec"

describe Admin::LinksController, type: :controller, inertia: true do
  render_views

  it_behaves_like "inherits from Admin::BaseController"

  let(:admin_user) { create(:admin_user) }
  let(:draft) { true }
  let(:deleted_at) { nil }
  let(:purchase_disabled_at) { Time.current }
  let(:product) { create(:product, draft:, deleted_at:, purchase_disabled_at:) }

  before do
    sign_in admin_user
  end

  describe "POST restore" do
    let(:deleted_at) { Time.current }

    before do
      post :restore, params: { id: product.unique_permalink }
      product.reload
    end

    it "restores a deleted product" do
      expect(product.deleted_at).to be_nil
      expect(response).to be_successful
    end
  end

  describe "GET show" do
    it "shows a Product page" do
      product = create(:product)
      installment = create(:product_installment, link: product)
      create(:product_file, installment_id: installment.id)

      get :show, params: { id: product.unique_permalink }

      expect(response).to be_successful
      expect(inertia.component).to eq("Admin/Products/Show")
    end

    it "redirects to a unique permalink URL if looked up via ID" do
      product = create(:product)

      get :show, params: { id: product.id }

      expect(response).to redirect_to(admin_product_path(product.unique_permalink))
    end

    it "redirects to a unique permalink URL if looked up via custom permalink" do
      product = create(:product, unique_permalink: "a", custom_permalink: "custom")

      get :show, params: { id: "custom" }

      expect(response).to redirect_to(admin_product_path(product.unique_permalink))
    end

    it "does not redirect for unique_permalink == custom_permalink" do
      product = create(:product, unique_permalink: "Cat", custom_permalink: "Cat")

      get :show, params: { id: "Cat" }

      expect(assigns(:product)).to eq(product)
      expect(response).to be_successful
    end

    it "lists all matches if multiple products matched by permalink" do
      product_1 = create(:product, unique_permalink: "a", custom_permalink: "match")
      product_2 = create(:product, unique_permalink: "b", custom_permalink: "match")
      create(:product, unique_permalink: "c", custom_permalink: "should-not-match")

      get :show, params: { id: "match" }

      expect(response).to be_successful
      expect(inertia.component).to eq("Admin/Products/MultipleMatches")
      expect(inertia.props[:product_matches].map { _1[:id] }).to match_array([product_1.id, product_2.id])
    end
  end
end
