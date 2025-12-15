# frozen_string_literal: true

require "spec_helper"
require "shared_examples/customers_service_context"

describe CustomersService do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, seller:, link: product) }

  RSpec.shared_context "with seller eligible to send emails" do
    before do
      create(:payment_completed, user: seller)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE)
      PostSendgridApi.mails.clear
    end
  end

  RSpec.shared_context "with missed posts setup" do |seller_variable: :seller, product_variable: :product, purchase_variable: :purchase|
    let!(:sent_post) { create(:installment, link: product, seller:, published_at: 2.days.ago) }
    let!(:missed_post1) { create(:installment, link: product, seller:, published_at: 1.day.ago) }
    let!(:missed_post2) { create(:installment, link: product, seller:, published_at: Time.current) }

    before do
      create(:creator_contacting_customers_email_info, installment: sent_post, purchase:)
    end
  end

  describe ".find_missed_posts_for" do
    include_context "with missed posts setup"

    it "returns missed posts" do
      workflow = create(:workflow, seller:, link: product, published_at: Time.current)

      expect(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: nil).and_call_original

      missed_posts = described_class.find_missed_posts_for(purchase:)

      expect(missed_posts).to contain_exactly(missed_post1, missed_post2)

      expect(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: workflow.external_id).and_call_original

      described_class.find_missed_posts_for(purchase:, workflow_id: workflow.external_id)
    end
  end

  describe ".find_sent_posts_for" do
    context "for normal purchases" do
      let(:other_product) { create(:product, user: seller) }
      let(:product_post) { create(:installment, link: product, seller:, published_at: 2.days.ago) }
      let(:other_product_post) { create(:installment, link: other_product, seller:, published_at: 1.day.ago) }
      let!(:product_email) { create(:creator_contacting_customers_email_info, installment: product_post, purchase:) }
      let!(:other_product_email) { create(:creator_contacting_customers_email_info, installment: other_product_post, purchase:) }

      it "returns only sent posts for the purchase's product, excludes other product posts" do
        sent_posts = described_class.find_sent_posts_for(purchase)

        expect(sent_posts).to contain_exactly(product_email)
        expect(sent_posts).not_to include(other_product_email)
      end

      it "returns only the latest email per installment when multiple emails exist" do
        product_post_2 = create(:installment, link: product, seller:, published_at: 1.day.ago)

        latest_email_product_post_1 = create(:creator_contacting_customers_email_info, installment: product_post, purchase:, sent_at: 1.day.ago)
        latest_email_product_post_2 = create(:creator_contacting_customers_email_info, installment: product_post_2, purchase:, sent_at: 1.day.ago)

        sent_posts = described_class.find_sent_posts_for(purchase)

        expect(sent_posts).to contain_exactly(latest_email_product_post_1, latest_email_product_post_2)
        expect(sent_posts).not_to include(product_email)
      end
    end

    context "for bundle purchase" do
      include_context "with bundle purchase setup"

      let(:bundle_post)   { create(:installment, link: bundle, seller:, published_at: 2.days.ago) }
      let(:product_a_post) { create(:installment, link: product_a, seller:, published_at: 1.day.ago) }
      let(:product_b_post) { create(:installment, link: product_b, seller:, published_at: 1.day.ago) }

      let(:product_a_purchase) { bundle_purchase.product_purchases.find_by(link: product_a) }
      let(:product_b_purchase) { bundle_purchase.product_purchases.find_by(link: product_b) }

      let!(:bundle_email) { create(:creator_contacting_customers_email_info, installment: bundle_post, purchase: bundle_purchase) }
      let!(:product_a_email) { create(:creator_contacting_customers_email_info, installment: product_a_post, purchase: product_a_purchase) }
      let!(:product_b_email) { create(:creator_contacting_customers_email_info, installment: product_b_post, purchase: product_b_purchase) }

      it "returns only sent posts for bundle purchase, excludes product posts" do
        result = described_class.find_sent_posts_for(bundle_purchase)

        expect(result).to contain_exactly(bundle_email)
        expect(result).not_to include(product_a_email, product_b_email)
      end

      context "bundle product purchases" do
        it "returns only sent posts for that product, excludes bundle and other product posts" do
          result = described_class.find_sent_posts_for(product_a_purchase)

          expect(result).to contain_exactly(product_a_email)
          expect(result).not_to include(bundle_email, product_b_email)
        end
      end
    end
  end

  describe ".find_workflow_options_for" do
    let!(:follower_workflow) { create(:workflow, link: product, seller:, workflow_type: Workflow::FOLLOWER_TYPE, created_at: 1.day.ago, published_at: 1.day.ago) }
    let!(:_deleted_seller_workflow) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, deleted_at: DateTime.current) }
    let!(:_audience_workflow) { create(:workflow, link: product, seller:, workflow_type: Workflow::AUDIENCE_TYPE, published_at: 1.day.ago) }
    let!(:product_workflow) { create(:workflow, link: product, seller:, name: "Alpha Workflow", published_at: 1.day.ago) }
    let!(:seller_workflow) { create(:workflow, link: nil, seller:, workflow_type: Workflow::SELLER_TYPE, name: "Beta Workflow", published_at: 1.day.ago) }
    let!(:seller_workflow_installment) { create(:workflow_installment, workflow: seller_workflow, seller:, published_at: Time.current) }

    let!(:other_seller) { create(:named_seller, username: "othseller#{SecureRandom.alphanumeric(8).downcase}", email: "other_seller_#{SecureRandom.hex(4)}@example.com") }
    let!(:other_seller_workflow) { create(:workflow, link: nil, seller: other_seller, workflow_type: Workflow::SELLER_TYPE, published_at: Time.current) }
    let!(:other_seller_installment) { create(:workflow_installment, workflow: other_seller_workflow, seller: other_seller, published_at: Time.current) }

    it "returns alive and published workflows sorted by name" do
      _follower_post = create(:workflow_installment, workflow: follower_workflow, seller:, published_at: Time.current)
      create(:workflow_installment, workflow: product_workflow, seller:, published_at: Time.current)

      workflow_options = described_class.find_workflow_options_for(purchase)

      expect(workflow_options).to eq([product_workflow, seller_workflow])
    end

    context "for bundle purchase" do
      include_context "with bundle purchase setup", with_variants: true

      let!(:bundle_workflow) { create(:workflow, seller:, link: bundle, name: "Gamma Workflow", published_at: Time.current) }
      let!(:product_a_workflow) { create(:workflow, seller:, link: product_a, name: "Delta Workflow", published_at: Time.current) }
      let!(:product_b_workflow) { create(:workflow, seller:, link: product_b, published_at: Time.current) }
      let!(:other_product_workflow) { create(:workflow, seller:, link: product, published_at: Time.current) }

      let!(:bundle_installment) { create(:workflow_installment, workflow: bundle_workflow, seller:, published_at: Time.current) }
      let!(:product_a_installment) { create(:workflow_installment, workflow: product_a_workflow, seller:, published_at: Time.current) }
      let!(:product_a_variant_installment) { create(:workflow_installment, workflow: product_a_variant_workflow, seller:, published_at: Time.current) }
      let!(:_product_b_installment) { create(:workflow_installment, workflow: product_b_workflow, seller:, published_at: Time.current) }
      let!(:_other_product_installment) { create(:workflow_installment, workflow: other_product_workflow, seller:, published_at: Time.current) }

      it "includes workflows for bundle and it's underlying products" do
        workflow_options = described_class.find_workflow_options_for(bundle_purchase)

        expect(workflow_options).to eq([seller_workflow, bundle_workflow])
      end

      context "specific product under a bundle purchase" do
        it "includes workflows for the product and its variants" do
          product_a_purchase = bundle_purchase.product_purchases.find_by(link: product_a)

          workflow_options_for_bundle_purchase_product_a = described_class.find_workflow_options_for(product_a_purchase)

          expect(workflow_options_for_bundle_purchase_product_a).to eq([seller_workflow, product_a_workflow])

          product_a_purchase.update!(variant_attributes: [product_a_variant])
          workflow_options_for_bundle_purchase_product_a_variant = described_class.find_workflow_options_for(product_a_purchase)

          expect(workflow_options_for_bundle_purchase_product_a_variant).to eq([seller_workflow, product_a_workflow, product_a_variant_workflow])
        end
      end
    end
  end

  describe ".send_post!" do
    include_context "with seller eligible to send emails"

    let(:post) { create(:installment, link: product) }

    it "sends email and creates email record" do
      purchase.create_url_redirect!
      Rails.cache.delete("post_email:#{post.id}:#{purchase.id}")

      expect(PostEmailApi).to receive(:process).with(
        post:,
        recipients: [{
          email: purchase.email,
          purchase:,
          url_redirect: purchase.url_redirect,
          subscription: purchase.subscription,
        }.compact_blank]
      ).and_call_original

      expect do
        result = described_class.send_post!(post:, purchase:)
        expect(result).to be true
      end.to change { CreatorContactingCustomersEmailInfo.count }.by(1)

      email_info = CreatorContactingCustomersEmailInfo.last
      expect(email_info.attributes).to include(
        "type" => "CreatorContactingCustomersEmailInfo",
        "installment_id" => post.id,
        "purchase_id" => purchase.id,
        "state" => "sent",
        "email_name" => "purchase_installment"
      )
      expect(email_info.sent_at).to be_within(1.second).of(Time.current)

      expect(PostSendgridApi.mails.size).to eq(1)
      expect(PostSendgridApi.mails.keys).to include(purchase.email)
    end

    it "raises SellerNotEligibleError when seller is not eligible to send emails" do
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)

      expect do
        described_class.send_post!(post:, purchase:)
      end.to raise_error(CustomersService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:, installment: post)).to be_empty
    end

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)

      expect do
        described_class.send_post!(post:, purchase:)
      end.to raise_error(CustomersService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:, installment: post)).to be_empty
    end

    it "includes subscription for membership purchases" do
      membership_purchase = create(:membership_purchase, link: create(:membership_product, user: seller))
      membership_purchase.create_url_redirect!
      Rails.cache.delete("post_email:#{post.id}:#{membership_purchase.id}")

      expect(PostEmailApi).to receive(:process).with(
        post:,
        recipients: [{
          email: membership_purchase.email,
          purchase: membership_purchase,
          url_redirect: membership_purchase.url_redirect,
          subscription: membership_purchase.subscription,
        }.compact_blank]
      ).and_call_original

      expect do
        described_class.send_post!(post:, purchase: membership_purchase)
      end.to change { CreatorContactingCustomersEmailInfo.count }.by(1)

      email_info = CreatorContactingCustomersEmailInfo.last
      expect(email_info.purchase_id).to eq(membership_purchase.id)
      expect(PostSendgridApi.mails.size).to eq(1)
      expect(PostSendgridApi.mails.keys).to include(membership_purchase.email)
    end
  end

  describe ".send_missed_posts_for!" do
    include_context "with seller eligible to send emails"

    it "passes correct arguments to SendMissedPostsJob" do
      described_class.send_missed_posts_for!(purchase:)
      expect(SendMissedPostsJob).to have_enqueued_sidekiq_job(purchase.external_id, nil).on("default")

      workflow = create(:workflow, seller:, link: product, published_at: Time.current)
      described_class.send_missed_posts_for!(purchase:, workflow_id: workflow.external_id)
      expect(SendMissedPostsJob).to have_enqueued_sidekiq_job(purchase.external_id, workflow.external_id).on("default")
    end

    it "raises SellerNotEligibleError when seller is not eligible to send emails" do
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)

      expect do
        described_class.send_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(SendMissedPostsJob.jobs).to be_empty
    end

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)

      expect do
        described_class.send_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

      expect(SendMissedPostsJob.jobs).to be_empty
    end
  end

  describe ".deliver_missed_posts_for!" do
    include_context "with missed posts setup"
    include_context "with seller eligible to send emails"

    before do
      purchase.create_url_redirect!
      [missed_post1, missed_post2].each do |p|
        Rails.cache.delete("post_email:#{p.id}:#{purchase.id}")
      end
    end

    it "sends emails for missed posts" do
      initial_count = CreatorContactingCustomersEmailInfo.count

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to change { CreatorContactingCustomersEmailInfo.count }.by(2)

      email_infos = CreatorContactingCustomersEmailInfo.where(purchase:).where("id > ?", initial_count).order(:id).last(2)
      expect(email_infos.map(&:installment_id)).to contain_exactly(missed_post1.id, missed_post2.id)

      email_infos.each do |email_info|
        expect(email_info.attributes).to include(
          "type" => "CreatorContactingCustomersEmailInfo",
          "purchase_id" => purchase.id,
          "state" => "sent",
          "email_name" => "purchase_installment"
        )
        expect(email_info.sent_at).to be_within(5.seconds).of(Time.current)
      end

      expect(PostSendgridApi.mails.size).to eq(1)
      expect(PostSendgridApi.mails.keys).to include(purchase.email)

      expect(CreatorContactingCustomersEmailInfo.where(installment: sent_post, purchase:).count).to eq(1)
    end

    it "passes workflow_id to find_missed_posts_for when provided" do
      workflow = create(:workflow, seller:, link: product, published_at: Time.current)

      expect(described_class).to receive(:find_missed_posts_for).with(purchase:, workflow_id: workflow.external_id).and_call_original

      described_class.deliver_missed_posts_for!(purchase:, workflow_id: workflow.external_id)
    end

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:).where(installment: [missed_post1, missed_post2])).to be_empty
    end

    it "raises SellerNotEligibleError when seller is not eligible to send emails" do
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:).where(installment: [missed_post1, missed_post2])).to be_empty
    end

    it "raises PostNotSentError and aborts batch sending when send_post! raises a StandardError" do
      error_message = "Network error occurred"
      allow(described_class).to receive(:send_post!).and_call_original
      allow(described_class).to receive(:send_post!).with(post: missed_post1, purchase:).and_raise(StandardError.new(error_message))

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::PostNotSentError) do |error|
        expect(error.message).to eq("Missed post #{missed_post1.id} could not be sent. Aborting batch sending for the remaining posts. Original message: #{error_message}")
        expect(error.backtrace).to be_an(Array)
        expect(error.backtrace).not_to be_empty
      end

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:).where(installment: [missed_post1, missed_post2])).to be_empty
    end
  end
end
