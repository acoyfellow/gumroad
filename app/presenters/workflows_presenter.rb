# frozen_string_literal: true

class WorkflowsPresenter
  def initialize(seller:)
    @seller = seller
  end

  def workflows_props
    {
      workflows: @seller.workflows.alive.order("created_at DESC").map do |workflow|
        WorkflowPresenter.new(seller: @seller, workflow:).workflow_props
      end
    }
  end

  def workflow_options_by_purchase_props(purchase:)
    @seller.workflows.alive.published
      .joins(:installments)
      .merge(Installment.alive.published)
      .includes(:base_variant)
      .distinct
      .select { |workflow| workflow.applies_to_purchase?(purchase) }
      .sort_by(&:name)
      .map { |workflow| WorkflowPresenter.new(seller: @seller, workflow:).workflow_option_props }
  end

  private
    attr_reader :seller
end
