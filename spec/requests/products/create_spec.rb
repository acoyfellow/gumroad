# frozen_string_literal: true

require "spec_helper"

describe "POST /links (Create Product)", type: :request do
  let(:seller) { create(:named_seller) }

  before do
    sign_in seller
  end

  describe "basic product creation" do
    it "creates a product with minimum required params" do
      expect do
        post "/links", params: { link: { price_cents: 100, name: "Test Product" } }
      end.to change { seller.links.count }.by(1)

      expect(response).to redirect_to(edit_link_path(Link.last))
    end

    it "sets display_product_reviews to true by default" do
      post "/links", params: { link: { price_cents: 100, name: "test link" } }

      link = seller.links.last
      expect(link.display_product_reviews).to be(true)
    end

    it "assigns 'other' taxonomy by default" do
      post "/links", params: { link: { price_cents: 100, name: "test link" } }

      expect(Link.last.taxonomy).to eq(Taxonomy.find_by(slug: "other"))
    end

    it "supports currency type selection" do
      post "/links", params: { link: { price_cents: 100, name: "test link", price_currency_type: "jpy" } }

      expect(Link.last.price_currency_type).to eq "jpy"
    end
  end

  describe "product types" do
    it "creates a bundle product" do
      post "/links", params: { link: { price_cents: 100, name: "Bundle", native_type: "bundle" } }

      product = Link.last
      expect(product.native_type).to eq("bundle")
      expect(product.is_bundle).to eq(true)
    end

    it "creates a coffee product" do
      seller.update(can_create_service_products: true)

      post "/links", params: { link: { price_cents: 100, name: "Coffee", native_type: "coffee" } }

      product = Link.last
      expect(product.native_type).to eq("coffee")
      expect(product.custom_button_text_option).to eq("donate_prompt")
    end

    context "physical products" do
      it "allows creation when enabled" do
        seller.update(can_create_physical_products: true)

        post "/links", params: { link: { price_cents: 100, name: "Physical Item", is_physical: true } }

        product = Link.last
        expect(product.is_physical).to be(true)
      end

      it "forbids creation when disabled" do
        post "/links", params: { link: { price_cents: 100, name: "Physical Item", is_physical: true } }

        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "subscription products" do
    it "creates a monthly subscription product" do
      post "/links", params: {
        link: {
          price_cents: 100,
          name: "Monthly Sub",
          is_recurring_billing: true,
          subscription_duration: "monthly"
        }
      }

      product = Link.last
      expect(product.is_recurring_billing).to be(true)
      expect(product.subscription_duration).to eq("monthly")
      expect(product.should_show_all_posts).to eq(true)
    end

    it "creates a yearly subscription product" do
      post "/links", params: {
        link: {
          price_cents: 100,
          name: "Yearly Sub",
          is_recurring_billing: true,
          subscription_duration: "yearly"
        }
      }

      product = Link.last
      expect(product.is_recurring_billing).to be(true)
      expect(product.subscription_duration).to eq("yearly")
    end

    it "defaults should_show_all_posts to true for recurring billing" do
      post "/links", params: {
        link: {
          price_cents: 100,
          name: "test link",
          is_recurring_billing: true
        }
      }

      expect(Link.last.should_show_all_posts).to eq(true)
    end
  end

  describe "authentication" do
    it "requires user to be signed in" do
      sign_out seller
      post "/links", params: { link: { price_cents: 100, name: "Test" } }

      expect(response).to redirect_to(new_user_session_path)
    end
  end

  describe "preorder param" do
    it "ignores is_in_preorder_state param" do
      post "/links", params: {
        link: {
          price_cents: 100,
          name: "preorder",
          is_in_preorder_state: true,
          release_at: 1.year.from_now.iso8601
        }
      }

      link = seller.links.last
      expect(link.name).to eq("preorder")
      expect(link.preorder_link.present?).to be(false)
    end
  end
end
