# frozen_string_literal: true

RSpec.shared_examples "returns 404 when product is not found" do |verb, param_key, action|
  it "returns 404 when product isn't found" do
    opts = { params: { param_key => "NOT real" } }
    opts[:as] = :json if verb == :patch
    expect { send(verb, action, **opts) }.to raise_error(ActionController::RoutingError)
  end
end

RSpec.shared_examples "unpublishing a product" do
  before { product.publish! }

  it "redirects to the given path with Unpublished! notice" do
    patch :update, params: request_params.deep_merge(product: { publish: false }), as: :json

    expect(response).to have_http_status(:see_other)
    expect(response).to redirect_to(unpublish_redirect_path)
    expect(flash[:notice]).to eq("Unpublished!")
    product.reload
    expect(product.purchase_disabled_at).to be_present
  end
end

RSpec.shared_examples_for "a failed publication" do
  it "does not publish the product and redirects with an error message" do
    patch :update, params: request_params.deep_merge(product: { publish: true }), as: :json

    expect(response).to have_http_status(:found)
    expect(response).to redirect_to(publish_failure_redirect_path)
    expect(flash[:alert]).to eq(failed_publication_alert_message)
    expect(failed_publication_product.reload.purchase_disabled_at).to be_present
  end
end

RSpec.shared_examples_for "publishing a product" do
  context "with valid requirements" do
    it "redirects to share tab with Published! notice" do
      product.unpublish!
      patch :update, params: request_params.deep_merge(product: { publish: true }), as: :json

      expect(response).to have_http_status(:see_other)
      expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
      expect(flash[:notice]).to eq("Published!")
      product.reload
      expect(product.draft).to be(false)
      expect(product.purchase_disabled_at).to be_nil
    end
  end

  context "when link is not publishable" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_product }
    let(:failed_publication_product) { product }

    before do
      product.unpublish!
      allow_any_instance_of(Link).to receive(:publishable?) { false }
    end

    it_behaves_like "a failed publication" do
      let(:failed_publication_alert_message) { "You must connect at least one payment method before you can publish this product for sale." }
    end
  end

  context "when user email is not confirmed" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_unpublished_product }
    let(:unpublished_product) { create(:physical_product, purchase_disabled_at: Time.current, user: seller) }

    before { seller.update!(confirmed_at: nil) }

    it_behaves_like "a failed publication" do
      let(:request_params) { @params.merge(product_id: unpublished_product.unique_permalink) }
      let(:failed_publication_product) { unpublished_product }
      let(:failed_publication_alert_message) { "You have to confirm your email address before you can do that." }
    end
  end

  context "when user email is empty" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_unpublished_product }
    let(:unpublished_product) { create(:physical_product, purchase_disabled_at: Time.current, user: seller) }

    before do
      seller.email = ""
      seller.save(validate: false)
    end

    it_behaves_like "a failed publication" do
      let(:request_params) { @params.merge(product_id: unpublished_product.unique_permalink) }
      let(:failed_publication_product) { unpublished_product }
      let(:failed_publication_alert_message) { "<span>To publish a product, we need you to have an email. <a href=\"#{settings_main_url}\">Set an email</a> to continue.</span>" }
    end
  end

  context "when an unknown exception is raised on publish" do
    let(:publish_failure_redirect_path) { publish_failure_redirect_path_for_product }
    let(:failed_publication_product) { product }

    before do
      product.unpublish!
      allow_any_instance_of(Link).to receive(:publish!).and_raise("error")
    end

    it_behaves_like "a failed publication" do
      let(:failed_publication_alert_message) { "Something broke. We're looking into what happened. Sorry about this!" }
      before { allow(Bugsnag).to receive(:notify).once }
    end
  end
end

RSpec.shared_examples_for "a product with offer code amount issues" do
  it "updates product fields and redirects with a warning message" do
    product.update!(price_currency_type: "usd", price_cents: 200)
    create(:offer_code, user: seller, products: [product], code: "BADCODE", amount_cents: 100)
    product.update!(price_cents: 150)
    patch :update, params: request_params, as: :json

    expect(response).to have_http_status(:see_other)
    expect(response).to redirect_to(redirect_path)
    expect(flash[:warning]).to eq("The following offer code discounts this product below $0.99, but not to $0: BADCODE. Please update it or it will not work at checkout.")
  end
end
