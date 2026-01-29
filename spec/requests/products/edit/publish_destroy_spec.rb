# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "shared_examples/collaborator_access"

describe "Products - Publish, Unpublish, Destroy (Request)", type: :request do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  before do
    sign_in seller
  end

  describe "POST /links/:id/publish" do
    let(:disabled_product) { create(:physical_product, purchase_disabled_at: Time.current, user: seller) }

    it "requires authentication" do
      sign_out seller
      post "/links/#{disabled_product.unique_permalink}/publish"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "enables a disabled product" do
      post "/links/#{disabled_product.unique_permalink}/publish"

      expect(response).to be_successful
      expect(disabled_product.reload.purchase_disabled_at).to be_nil
    end

    context "when product is not publishable" do
      before do
        allow_any_instance_of(Link).to receive(:publishable?) { false }
      end

      it "returns an error message" do
        post "/links/#{disabled_product.unique_permalink}/publish"

        expect(response).not_to be_successful
        body = response.parsed_body
        expect(body).to have_key("error_message")
      end

      it "does not publish the product" do
        post "/links/#{disabled_product.unique_permalink}/publish"

        expect(disabled_product.reload.purchase_disabled_at).to be_present
      end
    end

    context "when seller email is not confirmed" do
      before do
        seller.update!(confirmed_at: nil)
      end

      it "returns an error about email confirmation" do
        post "/links/#{disabled_product.unique_permalink}/publish"
        expect(response.parsed_body["error_message"]).to include("email")
      end

      it "does not publish the product" do
        post "/links/#{disabled_product.unique_permalink}/publish"
        expect(disabled_product.reload.purchase_disabled_at).to be_present
      end
    end

    context "when an unknown exception is raised" do
      before do
        allow_any_instance_of(Link).to receive(:publish!).and_raise("unexpected error")
      end

      it "sends a Bugsnag notification" do
        expect(Bugsnag).to receive(:notify)
        post "/links/#{disabled_product.unique_permalink}/publish"
      end

      it "returns a generic error message" do
        post "/links/#{disabled_product.unique_permalink}/publish"
        expect(response.parsed_body["error_message"]).to include("broke")
      end
    end
  end

  describe "POST /links/:id/unpublish" do
    it "requires authentication" do
      sign_out seller
      post "/links/#{product.unique_permalink}/unpublish"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "unpublishes a product" do
      post "/links/#{product.unique_permalink}/unpublish"

      expect(response).to be_successful
      expect(product.reload.purchase_disabled_at).to be_present
    end

    it "redirects to edit page with success notice" do
      post "/links/#{product.unique_permalink}/unpublish"

      expect(response).to redirect_to(edit_link_path(product))
    end
  end

  describe "DELETE /links/:id" do
    it "requires authentication" do
      sign_out seller
      delete "/links/#{product.unique_permalink}"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "deletes a product" do
      product_id = product.id
      delete "/links/#{product.unique_permalink}"

      expect(response).to be_successful
      expect(Link.find(product_id).deleted_at).to be_present
    end
  end

  describe "PUT /links/:id/sections" do
    it "requires authentication" do
      sign_out seller
      put "/links/#{product.unique_permalink}/sections", params: { sections: [] }
      expect(response).to redirect_to(new_user_session_path)
    end

    it "updates the seller profile sections for the product" do
      section1 = create(:seller_profile_products_section, seller:, product:)
      create(:seller_profile_products_section, seller:, product:)

      put "/links/#{product.unique_permalink}/sections",
          params: { sections: [section1.external_id], main_section_index: 0 }

      expect(product.reload).to have_attributes(
        sections: [section1.id],
        main_section_index: 0
      )
    end

    it "cleans up orphaned sections" do
      section1 = create(:seller_profile_products_section, seller:, product:)
      orphaned = create(:seller_profile_posts_section, seller:, product:)

      put "/links/#{product.unique_permalink}/sections",
          params: { sections: [section1.external_id], main_section_index: 0 }

      expect(orphaned.reload.deleted_at).to be_present
    end
  end
end
