# frozen_string_literal: true

require "spec_helper"

describe WorkflowsPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let!(:workflow1) { create(:workflow, link: product, seller:, workflow_type: Workflow::FOLLOWER_TYPE, name: "Alpha Workflow", created_at: 1.day.ago, published_at: 1.day.ago) }
  let!(:_workflow2) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, deleted_at: DateTime.current) }
  let!(:workflow3) { create(:workflow, link: product, seller:, name: "Beta Workflow", published_at: 1.day.ago) }
  let!(:workflow4) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, name: "Gamma Workflow", published_at: 1.day.ago) }
  describe "#workflows_props" do
    it "returns alive workflows ordered by created at descending" do
      result = described_class.new(seller:).workflows_props

      expect(result).to eq({
                             workflows: [
                               WorkflowPresenter.new(seller:, workflow: workflow3).workflow_props,
                               WorkflowPresenter.new(seller:, workflow: workflow4).workflow_props,
                               WorkflowPresenter.new(seller:, workflow: workflow1).workflow_props,
                             ]
                           })
    end
  end

  describe "#workflow_options_by_purchase_props" do
    it "returns alive and published workflows sorted by name" do
      purchase = create(:purchase, seller:, link: product)
      create(:installment, workflow: workflow1, published_at: Time.current)
      create(:installment, workflow: workflow3, published_at: Time.current)
      create(:installment, workflow: workflow4, published_at: Time.current)

      result = described_class.new(seller:).workflow_options_by_purchase_props(purchase:)

      expect(result).to eq([
                             WorkflowPresenter.new(seller:, workflow: workflow1).workflow_option_props,
                             WorkflowPresenter.new(seller:, workflow: workflow3).workflow_option_props,
                             WorkflowPresenter.new(seller:, workflow: workflow4).workflow_option_props
                           ])
    end
  end
end
