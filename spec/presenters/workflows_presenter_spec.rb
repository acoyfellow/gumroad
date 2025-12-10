# frozen_string_literal: true

require "spec_helper"

describe WorkflowsPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let!(:follower_workflow) { create(:workflow, link: product, seller:, workflow_type: Workflow::FOLLOWER_TYPE, created_at: 1.day.ago, published_at: 1.day.ago) }
  let!(:_deleted_seller_workflow) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, deleted_at: DateTime.current) }
  let!(:product_workflow) { create(:workflow, link: product, seller:, name: "Alpha Workflow", published_at: 1.day.ago) }
  let!(:seller_workflow) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, name: "Beta Workflow", published_at: 1.day.ago) }
  let!(:seller_workflow_installment) { create(:workflow_installment, workflow: seller_workflow, seller:, published_at: Time.current) }

  let!(:other_seller) { create(:named_seller, username: "othseller#{SecureRandom.alphanumeric(8).downcase}", email: "other_seller_#{SecureRandom.hex(4)}@example.com") }
  let!(:other_seller_workflow) { create(:workflow, link: nil, seller: other_seller, workflow_type: Workflow::SELLER_TYPE, published_at: Time.current) }
  let!(:other_seller_installment) { create(:workflow_installment, workflow: other_seller_workflow, seller: other_seller, published_at: Time.current) }

  describe "#workflows_props" do
    it "returns alive workflows ordered by created at descending" do
      result = described_class.new(seller:).workflows_props

      expect(result).to eq({
                             workflows: [
                               WorkflowPresenter.new(seller:, workflow: product_workflow).workflow_props,
                               WorkflowPresenter.new(seller:, workflow: seller_workflow).workflow_props,
                               WorkflowPresenter.new(seller:, workflow: follower_workflow).workflow_props,
                             ]
                           })
    end
  end

  describe "#workflow_options_by_purchase_props" do
    it "returns alive and published workflows sorted by name" do
      purchase = create(:purchase, seller:, link: product)
      _follower_post = create(:workflow_installment, workflow: follower_workflow, seller:, published_at: Time.current)
      create(:workflow_installment, workflow: product_workflow, seller:, published_at: Time.current)

      result = described_class.new(seller:).workflow_options_by_purchase_props(purchase:)

      expect(result).to eq([
                             WorkflowPresenter.new(seller:, workflow: product_workflow).workflow_option_props,
                             WorkflowPresenter.new(seller:, workflow: seller_workflow).workflow_option_props
                           ])
    end

    context "bundle purchase" do
      let(:product_a) { create(:product, user: seller) }
      let(:product_b) { create(:product, user: seller) }
      let(:bundle) { create(:product, :bundle, user: seller) }
      let(:bundle_purchase) { create(:purchase, link: bundle, seller:) }

      let!(:bundle_product_a) { create(:bundle_product, bundle: bundle, product: product_a) }
      let!(:bundle_product_b) { create(:bundle_product, bundle: bundle, product: product_b) }

      let!(:bundle_workflow) { create(:workflow, seller:, link: bundle, published_at: Time.current) }
      let!(:product_a_workflow) { create(:workflow, seller:, link: product_a, published_at: Time.current) }
      let!(:product_b_workflow) { create(:workflow, seller:, link: product_b, published_at: Time.current) }
      let!(:other_product_workflow) { create(:workflow, seller:, link: product, published_at: Time.current) }

      let!(:product_a_variant_category) { create(:variant_category, link: product_a) }
      let!(:product_a_variant) { create(:variant, variant_category: product_a_variant_category) }
      let!(:product_a_variant_workflow) { create(:variant_workflow, seller:, base_variant: product_a_variant, link: product_a, published_at: Time.current) }

      before { bundle_purchase.create_artifacts_and_send_receipt! }

      let!(:bundle_installment) { create(:workflow_installment, workflow: bundle_workflow, seller:, published_at: Time.current) }
      let!(:product_a_installment) { create(:workflow_installment, workflow: product_a_workflow, seller:, published_at: Time.current) }
      let!(:product_a_variant_installment) { create(:workflow_installment, workflow: product_a_variant_workflow, seller:, published_at: Time.current) }
      let!(:_product_b_installment) { create(:workflow_installment, workflow: product_b_workflow, seller:, published_at: Time.current) }
      let!(:_other_product_installment) { create(:workflow_installment, workflow: other_product_workflow, seller:, published_at: Time.current) }

      it "includes workflows for bundle and it's underlying products" do
        result = described_class.new(seller:).workflow_options_by_purchase_props(purchase: bundle_purchase)

        expect(result).to eq([
                               WorkflowPresenter.new(seller:, workflow: seller_workflow).workflow_option_props,
                               WorkflowPresenter.new(seller:, workflow: bundle_workflow).workflow_option_props
                             ])
      end

      context "specific product under a bundle purchase" do
        it "includes workflows for the product and its variants" do
          product_a_purchase = bundle_purchase.product_purchases.find_by(link: product_a)

          options_for_product_a = described_class.new(seller:).workflow_options_by_purchase_props(purchase: product_a_purchase)

          expect(options_for_product_a).to eq([
                                                WorkflowPresenter.new(seller:, workflow: seller_workflow).workflow_option_props,
                                                WorkflowPresenter.new(seller:, workflow: product_a_workflow).workflow_option_props
                                              ])

          product_a_purchase.update!(variant_attributes: [product_a_variant])

          options_for_bundle_purchase_with_product_a_variant = described_class.new(seller:).workflow_options_by_purchase_props(purchase: product_a_purchase)

          expect(options_for_bundle_purchase_with_product_a_variant).to eq([
                                                                             WorkflowPresenter.new(seller:, workflow: seller_workflow).workflow_option_props,
                                                                             WorkflowPresenter.new(seller:, workflow: product_a_workflow).workflow_option_props,
                                                                             WorkflowPresenter.new(seller:, workflow: product_a_variant_workflow).workflow_option_props
                                                                           ])
        end
      end
    end
  end
end
