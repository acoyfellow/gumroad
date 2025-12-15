# frozen_string_literal: true

require "spec_helper"

RSpec.shared_context "with bundle purchase setup" do |seller_variable: :seller, with_workflows: false, with_variants: false|
  define_method :get_seller_value do
    if seller_variable.to_s.start_with?("@")
      instance_variable_get(seller_variable)
    else
      send(seller_variable)
    end
  end

  let(:product_a) { create(:product, user: get_seller_value) }
  let(:product_b) { create(:product, user: get_seller_value) }
  let(:bundle) { create(:product, :bundle, user: get_seller_value) }
  let(:bundle_purchase) { create(:purchase, link: bundle, seller: get_seller_value) }

  let!(:bundle_product_a) { create(:bundle_product, bundle: bundle, product: product_a) }
  let!(:bundle_product_b) { create(:bundle_product, bundle: bundle, product: product_b) }

  before { bundle_purchase.create_artifacts_and_send_receipt! }

  if with_workflows
    let!(:bundle_workflow) { create(:workflow, seller: get_seller_value, link: bundle, published_at: Time.current) }
    let!(:product_a_workflow) { create(:workflow, seller: get_seller_value, link: product_a, published_at: Time.current) }
    let!(:product_b_workflow) { create(:workflow, seller: get_seller_value, link: product_b, published_at: Time.current) }
  end

  if with_variants
    let!(:product_a_variant_category) { create(:variant_category, link: product_a) }
    let!(:product_a_variant) { create(:variant, variant_category: product_a_variant_category) }
    let!(:product_a_variant_workflow) { create(:variant_workflow, seller: get_seller_value, base_variant: product_a_variant, link: product_a, published_at: Time.current) }
    let!(:product_a_variant_installment) { create(:workflow_installment, workflow: product_a_variant_workflow, seller: get_seller_value, published_at: Time.current) }
  end
end
