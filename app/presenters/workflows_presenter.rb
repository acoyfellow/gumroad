# frozen_string_literal: true

class WorkflowsPresenter
  def initialize(seller:, purchase: nil)
    @seller = seller
    @purchase = purchase
  end

  def workflows_props
    {
      workflows: seller.workflows.alive.order("created_at DESC").map do |workflow|
        WorkflowPresenter.new(seller:, workflow:).workflow_props
      end
    }
  end

  def workflow_options_by_purchase_props
    purchase.seller.workflows.alive.published
      .joins(:installments)
      .merge(Installment.seller_or_audience_or_product_or_variant_type_for_purchase(purchase).alive.published)
      .distinct
      .order(:name)
      .filter_map { |workflow| WorkflowPresenter.new(seller:, workflow:).workflow_option_props if workflow.applies_to_purchase?(purchase) }
  end

  private
    attr_reader :seller, :purchase
end
