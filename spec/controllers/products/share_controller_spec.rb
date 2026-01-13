# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "shared_examples/collaborator_access"
require "shared_examples/product_edit"
require "shared_examples/sellers_base_controller_concern"
require "inertia_rails/rspec"

describe Products::ShareController, inertia: true do
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

    it "renders the share edit page" do
      get :edit, params: { product_id: product.unique_permalink }

      expect(response).to be_successful
      presenter = controller.send(:edit_product_share_presenter)
      expect(presenter.product).to eq(product)
      expect(presenter.pundit_user).to eq(controller.pundit_user)
      expect(inertia.props[:title]).to eq(product.name)
      expect(inertia.component).to eq("Products/Share/Edit")
      expect(inertia.props[:product][:unique_permalink]).to eq(product.unique_permalink)
      expect(inertia.props[:product][:name]).to eq(product.name)
      expect(inertia.props[:product][:section_ids]).to be_an(Array)
      expect(inertia.props[:product][:tags]).to be_an(Array)
      expect(inertia.props[:product][:taxonomy_id]).to eq(product.taxonomy_id)
      expect(inertia.props[:product][:display_product_reviews]).to eq(product.display_product_reviews)
      expect(inertia.props[:product][:is_adult]).to eq(product.is_adult)
      expect(inertia.props[:product][:is_published]).to eq(product.published?)
      expect(inertia.props[:page_metadata][:taxonomies]).to be_present
      expect(inertia.props[:page_metadata][:profile_sections]).to be_an(Array)
      expect(inertia.props[:page_metadata][:successful_sales_count]).to eq(product.successful_sales_count)
      expect(inertia.props[:page_metadata][:sales_count_for_inventory]).to eq(product.max_purchase_count? ? product.sales_count_for_inventory : 0)
      expect(inertia.props[:page_metadata][:is_listed_on_discover]).to eq(product.recommendable?)
    end

    context "when product is unpublished" do
      let(:product) { create(:product, user: seller, draft: true) }

      it "redirects to the product edit page with a warning" do
        get :edit, params: { product_id: product.unique_permalink }

        expect(response).to be_redirect
        expect(response).to redirect_to(edit_product_path(product.unique_permalink))
        expect(flash[:warning]).to eq("Not yet! You've got to publish your awesome product before you can share it with your audience and the world.")
      end
    end
  end

  describe "PATCH update" do
    before do
      request.headers["X-Inertia"] = "true"
      request.headers["X-Inertia-Partial-Component"] = "Products/Share/Edit"
      request.headers["X-Inertia-Partial-Data"] = "product, flash, errors"
      @params = {
        product_id: product.unique_permalink,
        product: {
          taxonomy_id: product.taxonomy_id,
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

    it "only updates share tab fields" do
      original_name = product.name
      original_price = product.price_cents

      patch :update, params: @params.deep_merge!({ product: { name: "New Name", price_cents: 9999 } }), as: :json

      expect(response).to have_http_status(:see_other)
      expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
      expect(flash[:notice]).to eq("Changes saved!")
      product.reload
      expect(product.name).to eq(original_name)
      expect(product.price_cents).to eq(original_price)
    end

    it "returns error on validation failure" do
      allow_any_instance_of(Link).to receive(:save!).and_raise(ActiveRecord::RecordInvalid.new(product))

      patch :update, params: @params, as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
    end

    context "when unpublishing" do
      let(:base_update_params) { @params }

      it_behaves_like "unpublishes the product and redirects to", "content" do
        let(:unpublish_redirect_path) { edit_product_content_path(product.unique_permalink) }
      end
    end

    context "when unpublishing a coffee product" do
      let(:seller) { create(:user, :eligible_for_service_products) }
      let(:coffee_product) { create(:product, user: seller, native_type: Link::NATIVE_TYPE_COFFEE, price_cents: 1000) }
      let(:base_update_params) { { product_id: coffee_product.unique_permalink, product: { taxonomy_id: coffee_product.taxonomy_id } } }
      let(:product) { coffee_product }

      before do
        @params.merge!({ product_id: coffee_product.unique_permalink, product: { taxonomy_id: coffee_product.taxonomy_id } })
      end

      it_behaves_like "unpublishes the product and redirects to", "product" do
        let(:unpublish_redirect_path) { edit_product_path(coffee_product.unique_permalink) }
      end
    end

    context "when attempting to publish" do
      it "does not publish the product even if publish: true is sent" do
        product.unpublish!
        patch :update, params: @params.deep_merge!({ product: { publish: true } }), as: :json

        expect(response).to have_http_status(:found)
        expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
        product.reload
        expect(product.purchase_disabled_at).to be_present
      end
    end

    context "when offer code has amount issues" do
      before { @params.merge!({ product_id: product.unique_permalink, product: { taxonomy_id: product.taxonomy_id } }) }

      let(:base_update_params) { @params }
      let(:redirect_path) { edit_product_share_path(product.unique_permalink) }

      it_behaves_like "redirects with warning when offer code has amount issues"
    end

    describe "is_adult" do
      it "marks the product as adult if the is_adult param is true" do
        patch :update, params: @params.deep_merge(product: { is_adult: true }), as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
        expect(product.reload.is_adult).to eq(true)
      end

      it "marks the product as non-adult if the is_adult param is false" do
        product.update!(is_adult: true)
        patch :update, params: @params.deep_merge(product: { is_adult: false }), as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
        expect(product.reload.is_adult).to eq(false)
      end
    end

    describe "display_product_reviews" do
      it "marks the product as allowing display of reviews if the display_product_reviews param is true" do
        patch :update, params: @params.deep_merge(product: { display_product_reviews: true }), as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
        expect(product.reload.display_product_reviews).to eq(true)
      end

      it "marks the product as not allowing display of reviews if the display_product_reviews param is false" do
        product.update!(display_product_reviews: true)
        patch :update, params: @params.deep_merge(product: { display_product_reviews: false }), as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
        expect(product.reload.display_product_reviews).to eq(false)
      end
    end

    describe "profile sections" do
      it "updates profile sections" do
        product1 = create(:product, user: seller)
        product2 = create(:product, user: seller)
        section1 = create(:seller_profile_products_section, seller: seller, shown_products: [product1.id, product2.id])
        section2 = create(:seller_profile_products_section, seller: seller, shown_products: [product1.id])
        section3 = create(:seller_profile_products_section, seller: seller, shown_products: [product2.id])

        patch :update, params: {
          product_id: product1.unique_permalink,
          product: { taxonomy_id: product1.taxonomy_id, section_ids: [section3.external_id] },
        }, as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product1.unique_permalink))
        expect(section1.reload.shown_products).to eq [product2.id]
        expect(section2.reload.shown_products).to eq []
        expect(section3.reload.shown_products).to eq [product2.id, product1.id]

        patch :update, params: {
          product_id: product1.unique_permalink,
          product: { taxonomy_id: product1.taxonomy_id, section_ids: [] },
        }, as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product1.unique_permalink))
        expect(section1.reload.shown_products).to eq [product2.id]
        expect(section2.reload.shown_products).to eq []
        expect(section3.reload.shown_products).to eq [product2.id]
      end
    end

    describe "Tags and Categories" do
      describe "Adding tags" do
        let(:tags) { ["some sort of tàg!", "tagme", "🐗🐗"] }

        it "adds tags when there are none" do
          expect do
            patch :update, params: @params.deep_merge(product: { tags: }), as: :json
          end.to change { Tag.count }.by(3)

          expect(response).to have_http_status(:see_other)
          expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
          expect(product.reload.tags.pluck(:name)).to eq(tags)
        end

        it "adds tags when they exist" do
          create(:tag, name: "tagme")
          product.tag!("🐗🐗")
          expect do
            patch :update, params: @params.deep_merge(product: { tags: }), as: :json
          end.to change { Tag.count }.by(1)

          expect(response).to have_http_status(:see_other)
          expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
          expect(product.reload.tags.length).to eq(3)
          expect(product.has_tag?("some sort of tàg!")).to be(true)
        end

        it "removes all tags" do
          product.tag!("one tag")
          product.tag!("another tag")
          expect do
            patch :update, params: @params.deep_merge(product: { tags: [] }), as: :json
          end.to change { product.reload.tags.length }.from(2).to(0)

          expect(response).to have_http_status(:see_other)
          expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
        end

        it "does not remove tags if unchanged" do
          product.tag!("one tag")
          product.tag!("another tag")
          expect do
            patch :update, params: @params.deep_merge(product: { tags: product.tags.pluck(:name) }), as: :json
          end.not_to change { product.reload.tags.length }

          expect(response).to have_http_status(:see_other)
          expect(response).to redirect_to(edit_product_share_path(product.unique_permalink))
          expect(product.tags.pluck(:name)).to eq(["one tag", "another tag"])
        end
      end
    end
  end
end
