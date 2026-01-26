# frozen_string_literal: true

require "spec_helper"
require "shared_examples/customer_drawer_missed_posts_context"

describe CustomersService do
  let(:seller) { create(:named_user) }

  RSpec.shared_context "with seller eligible to send emails" do
    before do
      create(:payment_completed, user: seller)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE)
      PostSendgridApi.mails.clear
    end
  end

  describe ".send_post!" do
    include_context "customer drawer missed posts setup"
    include_context "with seller eligible to send emails"

    it "sends email and creates email record" do
      purchase.create_url_redirect!
      Rails.cache.delete("post_email:#{regular_post_product_a.id}:#{purchase.id}")

      expect(PostEmailApi).to receive(:process).with(
        post: regular_post_product_a,
        recipients: [{
          email: purchase.email,
          purchase:,
          url_redirect: purchase.url_redirect,
          subscription: purchase.subscription,
        }.compact_blank]
      ).and_call_original

      expect do
        result = described_class.send_post!(post: regular_post_product_a, purchase:)
        expect(result).to be true
      end.to change { CreatorContactingCustomersEmailInfo.count }.by(1)

      email_info = CreatorContactingCustomersEmailInfo.last
      expect(email_info.attributes).to include(
        "type" => "CreatorContactingCustomersEmailInfo",
        "installment_id" => regular_post_product_a.id,
        "purchase_id" => purchase.id,
        "state" => "sent",
        "email_name" => "purchase_installment"
      )
      expect(email_info.sent_at).to be_within(1.second).of(Time.current)

      expect(PostSendgridApi.mails.size).to eq(1)
      expect(PostSendgridApi.mails.keys).to include(purchase.email)
    end
  end

  describe ".send_missed_posts_for!" do
    include_context "customer drawer missed posts setup"
    include_context "with seller eligible to send emails"

    before do
      $redis.keys("missed_posts_job:#{purchase.external_id}:*").each { |k| $redis.del(k) }
    end

    it "sets Redis key with 'all' when workflow_id is nil" do
      described_class.send_missed_posts_for!(purchase:)

      expect($redis.exists?(RedisKey.missed_posts_job(purchase.external_id, "all"))).to be true
      ttl = $redis.ttl(RedisKey.missed_posts_job(purchase.external_id, "all"))
      expect(ttl).to be_between(3.days.to_i - 10, 3.days.to_i)
    end

    it "sets Redis key with specific workflow_id when provided" do
      workflow_id = workflow_post_product_a.workflow.external_id
      described_class.send_missed_posts_for!(purchase:, workflow_id:)

      expect($redis.exists?(RedisKey.missed_posts_job(purchase.external_id, workflow_id))).to be true
      ttl = $redis.ttl(RedisKey.missed_posts_job(purchase.external_id, workflow_id))
      expect(ttl).to be_between(3.days.to_i - 10, 3.days.to_i)
    end

    it "passes correct arguments to SendMissedPostsJob" do
      described_class.send_missed_posts_for!(purchase:)
      expect(SendMissedPostsJob).to have_enqueued_sidekiq_job(purchase.external_id, nil).on("default")

      described_class.send_missed_posts_for!(purchase:, workflow_id: workflow_post_product_a.workflow.external_id)
      expect(SendMissedPostsJob).to have_enqueued_sidekiq_job(purchase.external_id, workflow_post_product_a.workflow.external_id).on("default")
    end

    it "raises SellerNotEligibleError when seller is not eligible to send emails" do
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)

      expect do
        described_class.send_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(SendMissedPostsJob.jobs).to be_empty
      expect($redis.exists?(RedisKey.missed_posts_job(purchase.external_id, "all"))).to be false
    end

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)

      expect do
        described_class.send_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

      expect(SendMissedPostsJob.jobs).to be_empty
      expect($redis.exists?(RedisKey.missed_posts_job(purchase.external_id, "all"))).to be false
    end
  end

  describe ".deliver_missed_posts_for!" do
    include_context "customer drawer missed posts setup"
    include_context "with seller eligible to send emails"

    before do
      create(:creator_contacting_customers_email_info, installment: regular_post_product_a, purchase:)
      purchase.create_url_redirect!
      [
        seller_post_to_all_customers,
        seller_workflow_post_to_all_customers,
        seller_post_with_bought_products_filter_product_a_and_c,
        workflow_post_product_a
      ].each do |p|
        Rails.cache.delete("post_email:#{p.id}:#{purchase.id}")
      end
    end

    it "sends emails for missed posts" do
      initial_count = CreatorContactingCustomersEmailInfo.count
      expected_posts = [
        audience_post,
        seller_post_to_all_customers,
        seller_workflow_post_to_all_customers,
        seller_post_with_bought_products_filter_product_a_and_c,
        workflow_post_product_a
      ]
      allow(described_class).to receive(:send_post!).and_call_original

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to change { CreatorContactingCustomersEmailInfo.count }.by(5)

      expected_posts.each do |post|
        expect(described_class).to have_received(:send_post!).with(post:, purchase:)
      end

      email_infos = CreatorContactingCustomersEmailInfo.where(purchase:).where("id > ?", initial_count).order(:id).last(5)
      expect(email_infos.map(&:installment_id)).to contain_exactly(*expected_posts.map(&:id))

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

      expect(CreatorContactingCustomersEmailInfo.where(installment: regular_post_product_a, purchase:).count).to eq(1)
    end

    it "passes workflow_id to missed_for_purchase when provided" do
      expect(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: workflow_post_product_a.workflow.external_id).and_call_original

      described_class.deliver_missed_posts_for!(purchase:, workflow_id: workflow_post_product_a.workflow.external_id)
    end

    it "raises PostNotSentError and aborts batch sending when send_post! raises a StandardError" do
      error_message = "Network error occurred"
      allow(described_class).to receive(:send_post!).and_call_original
      allow(described_class).to receive(:send_post!).with(post: audience_post, purchase:).and_raise(StandardError.new(error_message))

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to raise_error(CustomersService::PostNotSentError) do |error|
        expect(error.message).to eq("Missed post #{audience_post.id} could not be sent. Aborting batch sending for the remaining posts. Original message: #{error_message}")
        expect(error.backtrace).to be_an(Array)
        expect(error.backtrace).not_to be_empty
      end

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:).where(installment: [
                                                                          audience_post,
                                                                          seller_post_to_all_customers,
                                                                          seller_workflow_post_to_all_customers,
                                                                          seller_post_with_bought_products_filter_product_a_and_c,
                                                                          workflow_post_product_a
                                                                        ])).to be_empty
    end
  end

  describe ".missed_posts_job_in_progress?" do
    let(:purchase_id) { "test_purchase_123" }
    let(:other_purchase_id) { "other_purchase_456" }
    let(:workflow_id) { "workflow_789" }
    let(:other_workflow_id) { "workflow_abc" }

    before do
      $redis.keys("missed_posts_job:#{purchase_id}:*").each { |k| $redis.del(k) }
      $redis.keys("missed_posts_job:#{other_purchase_id}:*").each { |k| $redis.del(k) }
    end

    context "when workflow_id is blank" do
      context "returns false" do
        it "when no keys exist for the purchase_id" do
          expect(described_class.missed_posts_job_in_progress?(purchase_id, nil)).to be false
          expect(described_class.missed_posts_job_in_progress?(purchase_id, "")).to be false
        end

        it "when keys exist for a different purchase_id" do
          $redis.setex(RedisKey.missed_posts_job(other_purchase_id, "all"), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, nil)).to be false
        end
      end

      context "returns true" do
        it "when 'all' key exists for the purchase_id" do
          $redis.setex(RedisKey.missed_posts_job(purchase_id, "all"), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, nil)).to be true
          expect(described_class.missed_posts_job_in_progress?(purchase_id, "")).to be true
        end

        it "when specific workflow_id key exists for the purchase_id" do
          $redis.setex(RedisKey.missed_posts_job(purchase_id, workflow_id), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, nil)).to be true
          expect(described_class.missed_posts_job_in_progress?(purchase_id, "")).to be true
        end
      end
    end

    context "when workflow_id is present" do
      context "returns false" do
        it "when no keys exist" do
          expect(described_class.missed_posts_job_in_progress?(purchase_id, workflow_id)).to be false
        end

        it "when only a different workflow_id key exists" do
          $redis.setex(RedisKey.missed_posts_job(purchase_id, other_workflow_id), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, workflow_id)).to be false
        end

        it "when keys exist for a different purchase_id" do
          $redis.setex(RedisKey.missed_posts_job(other_purchase_id, "all"), 100, "1")
          $redis.setex(RedisKey.missed_posts_job(other_purchase_id, workflow_id), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, workflow_id)).to be false
        end
      end

      context "returns true" do
        it "when 'all' key exists" do
          $redis.setex(RedisKey.missed_posts_job(purchase_id, "all"), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, workflow_id)).to be true
        end

        it "when specific workflow_id key exists" do
          $redis.setex(RedisKey.missed_posts_job(purchase_id, workflow_id), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, workflow_id)).to be true
        end

        it "when both 'all' and specific workflow_id keys exist" do
          $redis.setex(RedisKey.missed_posts_job(purchase_id, "all"), 100, "1")
          $redis.setex(RedisKey.missed_posts_job(purchase_id, workflow_id), 100, "1")

          expect(described_class.missed_posts_job_in_progress?(purchase_id, workflow_id)).to be true
        end
      end
    end
  end

  describe ".clear_missed_posts_job_key" do
    let(:purchase_id) { "test_purchase_123" }
    let(:workflow_id) { "workflow_456" }

    it "removes the specific workflow_id key" do
      $redis.setex(RedisKey.missed_posts_job(purchase_id, workflow_id), 100, "1")
      expect($redis.exists?(RedisKey.missed_posts_job(purchase_id, workflow_id))).to be true

      described_class.clear_missed_posts_job_key(purchase_id, workflow_id)

      expect($redis.exists?(RedisKey.missed_posts_job(purchase_id, workflow_id))).to be false
    end

    it "defaults to 'all' when workflow_id is not provided" do
      $redis.setex(RedisKey.missed_posts_job(purchase_id, "all"), 100, "1")
      expect($redis.exists?(RedisKey.missed_posts_job(purchase_id, "all"))).to be true

      described_class.clear_missed_posts_job_key(purchase_id)

      expect($redis.exists?(RedisKey.missed_posts_job(purchase_id, "all"))).to be false
    end

    it "does not remove other keys for the same purchase_id" do
      $redis.setex(RedisKey.missed_posts_job(purchase_id, "all"), 100, "1")
      $redis.setex(RedisKey.missed_posts_job(purchase_id, workflow_id), 100, "1")

      described_class.clear_missed_posts_job_key(purchase_id, workflow_id)

      expect($redis.exists?(RedisKey.missed_posts_job(purchase_id, "all"))).to be true
      expect($redis.exists?(RedisKey.missed_posts_job(purchase_id, workflow_id))).to be false
    end
  end
end
