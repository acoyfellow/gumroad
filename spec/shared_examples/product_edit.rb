# frozen_string_literal: true

RSpec.shared_examples "returns 404 when product is not found" do |verb, param_key, action|
  it "returns 404 when product isn't found" do
    opts = { params: { param_key => "NOT real" } }
    opts[:as] = :json if verb == :patch
    expect { send(verb, action, **opts) }.to raise_error(ActionController::RoutingError)
  end
end

RSpec.shared_examples "unpublishes the product and redirects to" do |tab_name|
  before { product.publish! }

  it "unpublishes the product and redirects to edit #{tab_name} tab" do
    patch :update, params: base_update_params.deep_merge(product: { publish: false }), as: :json

    expect(response).to have_http_status(:see_other)
    expect(response).to redirect_to(unpublish_redirect_path)
    expect(flash[:notice]).to eq("Unpublished!")
    product.reload
    expect(product.purchase_disabled_at).to be_present
  end
end

RSpec.shared_examples "publish flow" do
  it "redirects to share tab with Published! notice" do
    product.unpublish!
    patch :update, params: base_update_params.deep_merge(product: { publish: true }), as: :json

    expect(response).to have_http_status(:see_other)
    expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
    expect(flash[:notice]).to eq("Published!")
    product.reload
    expect(product.draft).to be(false)
    additional_publish_expectations(product) if respond_to?(:additional_publish_expectations, true)
  end

  context "when link is not publishable" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_product }

    before do
      product.unpublish!
      allow_any_instance_of(Link).to receive(:publishable?) { false }
    end

    it "returns an error message" do
      patch :update, params: base_update_params.deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(publish_failure_redirect_path)
      expect(flash[:alert]).to eq("You must connect at least one payment method before you can publish this product for sale.")
    end

    it "does not publish the link" do
      patch :update, params: base_update_params.deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(product.reload.purchase_disabled_at).to be_present
    end
  end

  context "when user email is not confirmed" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_unpublished_product }
    let(:unpublished_product) { create(:physical_product, purchase_disabled_at: Time.current, user: seller) }

    before { seller.update!(confirmed_at: nil) }

    it "returns an error message" do
      patch :update, params: update_params_for(unpublished_product).deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(publish_failure_redirect_path)
      expect(flash[:alert]).to eq("You have to confirm your email address before you can do that.")
    end

    it "does not publish the link" do
      patch :update, params: update_params_for(unpublished_product).deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(unpublished_product.reload.purchase_disabled_at).to be_present
    end
  end

  context "when user email is empty" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_unpublished_product }
    let(:unpublished_product) { create(:physical_product, purchase_disabled_at: Time.current, user: seller) }

    before do
      seller.email = ""
      seller.save(validate: false)
    end

    it "includes error_message when publishing" do
      patch :update, params: update_params_for(unpublished_product).deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(publish_failure_redirect_path)
      expect(flash[:alert]).to eq("<span>To publish a product, we need you to have an email. <a href=\"#{settings_main_url}\">Set an email</a> to continue.</span>")
    end
  end

  context "when an unknown exception is raised on publish" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_product }

    before do
      product.unpublish!
      allow_any_instance_of(Link).to receive(:publish!).and_raise("error")
    end

    it "sends a Bugsnag notification" do
      expect(Bugsnag).to receive(:notify).once

      patch :update, params: base_update_params.deep_merge(product: { publish: true }), as: :json
    end

    it "returns an error message" do
      patch :update, params: base_update_params.deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(publish_failure_redirect_path)
      expect(flash[:alert]).to eq("Something broke. We're looking into what happened. Sorry about this!")
    end

    it "does not publish the link" do
      patch :update, params: base_update_params.deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:found)
      expect(product.reload.purchase_disabled_at).to be_present
    end
  end
end

RSpec.shared_examples "redirects with warning when offer code has amount issues" do
  it "redirects and sets flash warning" do
    product.update!(price_currency_type: "usd", price_cents: 200)
    create(:offer_code, user: seller, products: [product], code: "BADCODE", amount_cents: 100)
    product.update!(price_cents: 150)
    patch :update, params: base_update_params, as: :json

    expect(response).to have_http_status(:see_other)
    expect(response).to redirect_to(redirect_path)
    expect(flash[:warning]).to eq("The following offer code discounts this product below $0.99, but not to $0: BADCODE. Please update it or it will not work at checkout.")
  end
end
