# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"

describe "Products - Index and New Actions (Request)", type: :request do
  let(:seller) { create(:named_seller) }

  before do
    sign_in seller
  end

  describe "GET /links" do
    it "requires authentication" do
      sign_out seller
      get "/links"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "renders the Products/Index component with correct props" do
      get "/links"

      expect(response).to be_successful
      expect(response.body).to include("Products/Index")
    end

    it "includes archived products count in props" do
      create(:product, user: seller, deleted_at: Time.current)

      get "/links"

      expect(response).to be_successful
      # The response should include the Inertia props
      expect(response.body).to include("archived_products_count")
    end

    it "includes can_create_product flag" do
      get "/links"

      expect(response).to be_successful
      expect(response.body).to include("can_create_product")
    end
  end

  describe "GET /links/new" do
    it "requires authentication" do
      sign_out seller
      get "/links/new"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "renders the Products/New component" do
      get "/links/new"

      expect(response).to be_successful
      expect(response.body).to include("Products/New")
    end
  end
end
