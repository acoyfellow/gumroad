# frozen_string_literal: true

require "spec_helper"

describe WorkflowsPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  describe "#workflows_props" do
    let!(:workflow1) { create(:workflow, link: product, seller:, workflow_type: Workflow::FOLLOWER_TYPE, created_at: 1.day.ago) }
    let!(:_workflow2) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, deleted_at: DateTime.current) }
    let!(:workflow3) { create(:workflow, link: product, seller:) }
    let!(:workflow4) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE) }

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
    it "calls service and formats workflow options" do
      purchase = create(:purchase, seller:, link: product)
      workflow1 = create(:workflow, seller:, name: "Workflow 1")
      workflow2 = create(:workflow, seller:, name: "Workflow 2")

      allow(CustomersService).to receive(:find_workflow_options_for).with(purchase).and_return([workflow1, workflow2])

      result = described_class.new(seller:).workflow_options_by_purchase_props(purchase)

      expect(CustomersService).to have_received(:find_workflow_options_for).with(purchase)
      expect(result).to eq([
                             WorkflowPresenter.new(seller:, workflow: workflow1).workflow_option_props,
                             WorkflowPresenter.new(seller:, workflow: workflow2).workflow_option_props
                           ])
    end
  end
end
