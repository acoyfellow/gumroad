# frozen_string_literal: true

require "spec_helper"
require "shared_examples/admin_base_controller_concern"

describe Admin::LinksController do
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

  describe "POST is_adult" do
    it "updates the product's is_adult flag" do
      post :is_adult, params: { id: product.unique_permalink, is_adult: "1" }
      expect(response).to be_successful
      expect(product.reload.is_adult).to be(true)

      post :is_adult, params: { id: product.unique_permalink, is_adult: "0" }
      expect(response).to be_successful
      expect(product.reload.is_adult).to be(false)
    end
  end

  describe "POST publish" do
    let(:deleted_at) { Time.current }

    it "publishes the product" do
      expect(product.draft).to be(true)
      expect(product.deleted_at?).to be(true)
      expect(product.purchase_disabled_at?).to be(true)

      post :publish, params: { id: product.unique_permalink }
      expect(response).to be_successful

      expect(product.reload.draft).to be(false)
      expect(product.deleted_at?).to be(false)
      expect(product.purchase_disabled_at?).to be(false)
    end
  end

  describe "POST unpublish" do
    let(:draft) { false }
    let(:purchase_disabled_at) { nil }

    it "unpublishes the product" do
      expect(product.draft).to be(false)
      expect(product.purchase_disabled_at?).to be(false)
      expect(product.is_unpublished_by_admin).to be(false)

      post :unpublish, params: { id: product.unique_permalink }
      expect(response).to be_successful

      product.reload
      expect(product.purchase_disabled_at?).to be(true)
      expect(product.is_unpublished_by_admin).to be(false)
    end
  end

  describe "DELETE destroy" do
    it "destroys the product" do
      freeze_time do
        delete :destroy, params: { id: product.unique_permalink }
        product.reload
        expect(product.deleted_at?).to be(true)
        expect(JSON.parse(response.body)).to eq({ "success" => true })

        expect(DeleteProductFilesWorker).to have_enqueued_sidekiq_job(product.id).in(10.minutes)
        expect(DeleteProductRichContentWorker).to have_enqueued_sidekiq_job(product.id).in(10.minutes)
        expect(DeleteProductFilesArchivesWorker).to have_enqueued_sidekiq_job(product.id, nil).in(10.minutes)
        expect(DeleteWishlistProductsJob).to have_enqueued_sidekiq_job(product.id).in(10.minutes)
      end
    end
  end

  describe "POST restore" do
    let(:deleted_at) { Time.current }

    before do
      post :restore, params: { id: product.unique_permalink }
      product.reload
    end

    it "restores the product" do
      expect(product.deleted_at?).to be(false)
      expect(JSON.parse(response.body)).to eq({ "success" => true })
    end
  end
end
