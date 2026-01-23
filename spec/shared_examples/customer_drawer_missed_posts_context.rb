# frozen_string_literal: true

require "spec_helper"

RSpec.shared_context "customer drawer missed posts setup" do
  let(:seller) { create(:user) }
  let(:product_a) { create(:product, user: seller) }
  let(:product_b) { create(:product, user: seller) }
  let(:product_c) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, link: product_a, seller:) }

  let!(:audience_post) { create(:audience_installment, :published, seller:) }
  let!(:follower_post) { create(:follower_post, :published, seller:) }
  let!(:affiliate_post) { create(:affiliate_post, :published, seller:) }
  let!(:abandoned_cart_workflow) { create(:abandoned_cart_workflow, :published, seller:) }

  let!(:product_a_variant_category) { create(:variant_category, link: product_a) }
  let!(:product_a_variant) { create(:variant, variant_category: product_a_variant_category) }
  let!(:product_b_variant_category) { create(:variant_category, link: product_b) }
  let!(:product_b_variant) { create(:variant, variant_category: product_b_variant_category) }
  let!(:product_c_variant_category) { create(:variant_category, link: product_c) }
  let!(:product_c_variant) { create(:variant, variant_category: product_c_variant_category) }

  let!(:seller_post_to_all_customers) { create(:seller_installment, :published, seller:) }
  let!(:seller_workflow) { create(:seller_workflow, :published, seller:) }
  let!(:seller_workflow_post_to_all_customers) { create(:seller_installment, :published, seller:, workflow: seller_workflow) }
  let!(:seller_post_with_bought_products_filter_product_a_and_c) { create(:seller_installment, :published, seller:, bought_products: [product_a.unique_permalink, product_c.unique_permalink]) }
  let!(:seller_post_with_bought_variants_filter_product_a_and_c_variant) { create(:seller_installment, :published, seller:, bought_variants: [product_a_variant.external_id, product_c_variant.external_id]) }

  let!(:regular_post_product_a) { create(:product_installment, :published, link: product_a, seller:) }
  let!(:regular_post_product_a_variant) { create(:variant_installment, :published, base_variant: product_a_variant, link: product_a, seller:) }
  let!(:workflow_post_product_a) { create(:workflow_installment, :published, link: product_a, seller:, workflow: create(:workflow, :published, seller:, link: product_a)) }
  let!(:workflow_post_product_a_variant) { create(:workflow_installment, :published, link: product_a, seller:, workflow: create(:variant_workflow, :published, seller:, link: product_a, base_variant: product_a_variant)) }

  let!(:regular_post_product_b) { create(:product_installment, link: product_b, seller:) }
  let!(:regular_post_product_b_variant) { create(:variant_installment, base_variant: product_b_variant, link: product_b, seller:) }
  let!(:workflow_post_product_b) { create(:workflow_installment, link: product_b, seller:) }
  let!(:workflow_post_product_b_variant) { create(:workflow_installment, :published, link: product_b, seller:, workflow: create(:variant_workflow, :published, seller:, link: product_b, base_variant: product_b_variant)) }
end

RSpec.shared_context "with bundle purchase setup" do |with_posts: false|
  before do
    missing_vars = [:seller, :product_a, :product_b, :product_a_variant, :product_b_variant].reject { respond_to?(_1) }

    if missing_vars.any?
      raise ArgumentError,
            "with bundle purchase setup requires 'customer drawer missed posts setup' context. " \
            "Missing variables: #{missing_vars.join(', ')}. " \
            "Please include the parent context first: include_context 'customer drawer missed posts setup'"
    end
  end

  let(:bundle) { create(:product, :bundle, user: seller) }
  let(:bundle_purchase) { create(:purchase, link: bundle, seller:) }

  let!(:bundle_product_a) { create(:bundle_product, bundle:, product: product_a, variant: product_a_variant) }
  let!(:bundle_product_b) { create(:bundle_product, bundle:, product: product_b, variant: product_b_variant) }

  before { bundle_purchase.create_artifacts_and_send_receipt! }

  if with_posts
    let!(:bundle_post) { create(:installment, :published, link: bundle, seller:) }
    let!(:bundle_workflow) { create(:workflow, :published, seller:, link: bundle) }
    let!(:bundle_workflow_post) { create(:workflow_installment, :published, link: bundle, workflow: bundle_workflow, seller:) }
  end
end
