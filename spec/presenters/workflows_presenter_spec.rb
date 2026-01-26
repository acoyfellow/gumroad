# frozen_string_literal: true

require "spec_helper"

describe WorkflowsPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  let!(:workflow1) { create(:workflow, link: product, seller:, workflow_type: Workflow::FOLLOWER_TYPE, created_at: 1.day.ago, published_at: 1.day.ago) }
  let!(:workflow2) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, deleted_at: DateTime.current, published_at: 3.day.ago) }
  let!(:workflow3) { create(:workflow, link: product, seller:, published_at: 1.day.ago, name: "1. Should be first") }
  let!(:workflow4) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, published_at: 1.day.ago, name: "2. Should be second") }

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
    it "formats workflow options" do
      create(:workflow_installment, workflow: workflow3, seller:, published_at: 1.day.ago, link_id: workflow3.link_id)

      workflow_options = described_class.new(seller:).workflow_options_by_purchase_props([workflow3])

      expect(workflow_options).to eq([WorkflowPresenter.new(seller:, workflow: workflow3).workflow_option_props])
    end
  end
end
