# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "shared_examples/collaborator_access"
require "shared_examples/product_edit"
require "shared_examples/sellers_base_controller_concern"
require "inertia_rails/rspec"

describe Products::ReceiptController, inertia: true do
  it_behaves_like "inherits from Sellers::BaseController"

  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    it_behaves_like "returns 404 when product is not found", :get, :product_id, :edit

    it_behaves_like "authorize called for action", :get, :edit do
      let(:record) { product }
      let(:request_params) { { product_id: product.unique_permalink } }
    end

    it "renders the receipt edit page" do
      get :edit, params: { product_id: product.unique_permalink }

      expect(response).to be_successful
      presenter = controller.send(:edit_product_receipt_presenter)
      expect(presenter.product).to eq(product)
      expect(presenter.pundit_user).to eq(controller.pundit_user)
      expect(inertia.props[:title]).to eq(product.name)
      expect(inertia.component).to eq("Products/Receipt/Edit")
      expect(inertia.props[:product][:unique_permalink]).to eq(product.unique_permalink)
      expect(inertia.props[:product][:name]).to eq(product.name)
      expect(inertia.props[:product][:custom_receipt_text]).to eq(product.custom_receipt_text)
      expect(inertia.props[:product][:custom_view_content_button_text]).to eq(product.custom_view_content_button_text)
      expect(inertia.props[:product][:native_type]).to eq(product.native_type)
      expect(inertia.props[:product][:is_published]).to eq(product.published?)
      expect(inertia.props[:page_metadata]).to eq(
        custom_receipt_text_max_length: Product::Validations::MAX_CUSTOM_RECEIPT_TEXT_LENGTH,
        custom_view_content_button_text_max_length: Product::Validations::MAX_VIEW_CONTENT_BUTTON_TEXT_LENGTH
      )
      expect(inertia.props[:receipt_preview_html]).to be_present
    end

    context "for partial visits" do
      before do
        request.headers["X-Inertia"] = "true"
        request.headers["X-Inertia-Partial-Component"] = "Products/Receipt/Edit"
        request.headers["X-Inertia-Partial-Data"] = "receipt_preview_html"
      end

      it "returns receipt_preview_html with expected content" do
        custom_receipt_text = "Thank you for your purchase!"
        custom_view_content_button_text = "View content"

        get :edit, params: { product_id: product.unique_permalink, custom_receipt_text:, custom_view_content_button_text: }

        expect(response).to be_successful
        receipt_preview_html = inertia.props.deep_symbolize_keys[:receipt_preview_html]
        expect(receipt_preview_html).to be_present
        expect(receipt_preview_html).to be_a(String)
        expect(receipt_preview_html).to include("</table>")
        expect(receipt_preview_html).to include(custom_receipt_text)
        expect(receipt_preview_html).to include(custom_view_content_button_text)
      end
    end
  end

  describe "PATCH update" do
    before do
      request.headers["X-Inertia"] = "true"
      request.headers["X-Inertia-Partial-Component"] = "Products/Receipt/Edit"
      request.headers["X-Inertia-Partial-Data"] = "product, flash, errors"
      @params = {
        product_id: product.unique_permalink,
        product: {
          custom_receipt_text: "Thank you for purchasing! Feel free to contact us any time for support.",
          custom_view_content_button_text: "Get Your Files",
        },
      }
    end

    it_behaves_like "returns 404 when product is not found", :patch, :product_id, :update

    it_behaves_like "authorize called for action", :patch, :update do
      let(:record) { product }
      let(:request_params) { @params }
    end

    it_behaves_like "collaborator can access", :patch, :update do
      let(:request_format) { :json }
      let(:request_params) { @params }
      let(:response_status) { 303 }
    end

    it_behaves_like "a product with offer code amount issues" do
      let(:request_params) { @params }
      let(:redirect_path) { edit_product_receipt_path(product.unique_permalink) }
    end

    it_behaves_like "publishing a product" do
      let(:request_params) { @params }
      let(:publish_failure_redirect_path_for_product) { edit_product_receipt_path(product.unique_permalink) }
      let(:publish_failure_redirect_path_for_unpublished_product) { edit_product_receipt_path(unpublished_product.unique_permalink) }
    end

    it_behaves_like "unpublishing a product" do
      let(:request_params) { @params }
      let(:unpublish_redirect_path) { edit_product_receipt_path(product.unique_permalink) }
    end

    it "only updates receipt fields" do
      original_name = product.name
      original_price = product.price_cents

      patch :update, params: @params.deep_merge!({ product: { name: "New Name", price_cents: 9999 } }), as: :json

      expect(response).to have_http_status(:see_other)
      expect(response).to redirect_to(edit_product_receipt_path(product.unique_permalink))
      expect(flash[:notice]).to eq("Changes saved!")
      product.reload
      expect(product.custom_receipt_text).to eq("Thank you for purchasing! Feel free to contact us any time for support.")
      expect(product.custom_view_content_button_text).to eq("Get Your Files")
      expect(product.name).to eq(original_name)
      expect(product.price_cents).to eq(original_price)
    end

    it "returns error on validation failure" do
      invalid_text = "x" * (Product::Validations::MAX_CUSTOM_RECEIPT_TEXT_LENGTH + 1)

      request.headers["X-Inertia"] = "true"
      request.headers["X-Inertia-Partial-Component"] = "Products/Receipt/Edit"
      request.headers["X-Inertia-Partial-Data"] = "product, flash, errors"
      patch :update, params: @params.deep_merge!({ product: { custom_receipt_text: invalid_text } }), as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(edit_product_receipt_path(product.unique_permalink))

      get :edit, params: { product_id: product.unique_permalink }, as: :json

      expect(response).to be_successful
      expect(inertia.props.deep_symbolize_keys[:errors]).to eq(
        { "product.base": "Custom receipt text is too long (maximum is 500 characters)",
          "product.custom_receipt_text": "is too long (maximum is 500 characters)" }
      )
    end
  end
end
