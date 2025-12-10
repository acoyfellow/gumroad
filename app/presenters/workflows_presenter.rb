# frozen_string_literal: true

class WorkflowsPresenter
  def initialize(seller:)
    @seller = seller
  end

  def workflows_props
    {
      workflows: seller.workflows.alive.order("created_at DESC").map do |workflow|
        WorkflowPresenter.new(seller:, workflow:).workflow_props
      end
    }
  end

  def workflow_options_by_purchase_props(purchase:)
    seller.workflows.alive.published
      .joins(:installments)
      .merge(
        seller.installments.alive.published
          .seller_or_product_or_variant_type_for_purchase(purchase)
      )
      .distinct
      .order(:name)
      .filter_map do |workflow|
        workflow.applies_to_purchase?(purchase) && WorkflowPresenter.new(seller:, workflow:).workflow_option_props
      end
  end

  private
    attr_reader :seller
end
