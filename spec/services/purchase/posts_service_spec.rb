# frozen_string_literal: true

require "spec_helper"

describe Purchase::PostsService do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, seller:, link: product) }

  describe ".find_missed_posts_for" do
    let!(:sent_post) { create(:installment, link: product, seller:, published_at: 2.days.ago) }
    let!(:missed_post1) { create(:installment, link: product, seller:, published_at: 1.day.ago) }
    let!(:missed_post2) { create(:installment, link: product, seller:, published_at: Time.current) }

    before do
      create(:creator_contacting_customers_email_info, installment: sent_post, purchase:)
    end

    it "returns only posts that haven't been sent" do
      expect(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: nil).and_call_original

      result = described_class.find_missed_posts_for(purchase:)

      expect(result).to contain_exactly(missed_post1, missed_post2)
    end

    it "passes workflow_id to scope when provided" do
      workflow = create(:workflow, seller:, link: product, published_at: Time.current)

      expect(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: workflow.external_id).and_call_original

      described_class.find_missed_posts_for(purchase:, workflow_id: workflow.external_id)
    end
  end

  describe ".send_post!" do
    let(:post) { create(:installment, link: product) }

    before do
      PostSendgridApi.mails.clear
      create(:payment_completed, user: seller)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE)
    end

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
      end.to raise_error(Purchase::PostsService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:, installment: post)).to be_empty
    end

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)

      expect do
        described_class.send_post!(post:, purchase:)
      end.to raise_error(Purchase::PostsService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

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
    before do
      create(:payment_completed, user: seller)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE)
    end

    it "enqueues SendMissedPostsJob with purchase external ID" do
      described_class.send_missed_posts_for!(purchase:)

      expect(SendMissedPostsJob).to have_enqueued_sidekiq_job(purchase.external_id, nil).on("default")
    end

    it "raises SellerNotEligibleError when seller is not eligible to send emails" do
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)

      expect do
        described_class.send_missed_posts_for!(purchase:)
      end.to raise_error(Purchase::PostsService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(SendMissedPostsJob.jobs).to be_empty
    end

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)

      expect do
        described_class.send_missed_posts_for!(purchase:)
      end.to raise_error(Purchase::PostsService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

      expect(SendMissedPostsJob.jobs).to be_empty
    end
  end

  describe ".deliver_missed_posts_for!" do
    let!(:sent_post) { create(:installment, link: product, seller:, published_at: 2.days.ago) }
    let!(:missed_post1) { create(:installment, link: product, seller:, published_at: 1.day.ago) }
    let!(:missed_post2) { create(:installment, link: product, seller:, published_at: Time.current) }

    before do
      create(:payment_completed, user: seller)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE)
      purchase.create_url_redirect!
      PostSendgridApi.mails.clear
      create(:creator_contacting_customers_email_info, installment: sent_post, purchase:)
    end

    it "sends emails for missed posts" do
      initial_count = CreatorContactingCustomersEmailInfo.count
      [missed_post1, missed_post2].each do |p|
        Rails.cache.delete("post_email:#{p.id}:#{purchase.id}")
      end

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

    it "raises CustomerDNDEnabledError when user can't be contacted for purchase" do
      purchase.update!(can_contact: false)
      [missed_post1, missed_post2].each do |p|
        Rails.cache.delete("post_email:#{p.id}:#{purchase.id}")
      end

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to raise_error(Purchase::PostsService::CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:).where(installment: [missed_post1, missed_post2])).to be_empty
    end

    it "raises SellerNotEligibleError when seller is not eligible to send emails" do
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)
      [missed_post1, missed_post2].each do |p|
        Rails.cache.delete("post_email:#{p.id}:#{purchase.id}")
      end

      expect do
        described_class.deliver_missed_posts_for!(purchase:)
      end.to raise_error(Purchase::PostsService::SellerNotEligibleError, "You are not eligible to resend this email.")

      expect(PostSendgridApi.mails).to be_empty
      expect(CreatorContactingCustomersEmailInfo.where(purchase:).where(installment: [missed_post1, missed_post2])).to be_empty
    end
  end

  describe ".sent_posts_for" do
    context "for normal purchases" do
      let(:other_product) { create(:product, user: seller) }

      it "returns only sent posts for the purchase's product, excludes other product posts" do
        product_post = create(:installment, link: product, seller:, published_at: 2.days.ago)
        other_product_post = create(:installment, link: other_product, seller:, published_at: 1.day.ago)

        product_email = create(:creator_contacting_customers_email_info, installment: product_post, purchase:)
        other_product_email = create(:creator_contacting_customers_email_info, installment: other_product_post, purchase:)

        result = described_class.sent_posts_for(purchase)

        expect(result).to contain_exactly(product_email)
        expect(result).not_to include(other_product_email)
      end

      it "returns only the latest email per installment when multiple emails exist" do
        post1 = create(:installment, link: product, seller:, published_at: 2.days.ago)
        post2 = create(:installment, link: product, seller:, published_at: 1.day.ago)

        old_email1 = create(:creator_contacting_customers_email_info, installment: post1, purchase:, sent_at: 2.days.ago)
        latest_email1 = create(:creator_contacting_customers_email_info, installment: post1, purchase:, sent_at: 1.day.ago)

        email2 = create(:creator_contacting_customers_email_info, installment: post2, purchase:, sent_at: 1.day.ago)

        result = described_class.sent_posts_for(purchase)

        expect(result).to contain_exactly(latest_email1, email2)
        expect(result).not_to include(old_email1)
      end
    end

    context "for bundle purchases" do
      let(:product_a) { create(:product, user: seller) }
      let(:product_b) { create(:product, user: seller) }
      let(:bundle) { create(:product, :bundle, user: seller) }
      let(:bundle_purchase) { create(:purchase, link: bundle, seller:) }

      let!(:bundle_product_a) { create(:bundle_product, bundle: bundle, product: product_a) }
      let!(:bundle_product_b) { create(:bundle_product, bundle: bundle, product: product_b) }

      before { bundle_purchase.create_artifacts_and_send_receipt! }

      it "returns only sent posts for bundle purchase, excludes product posts" do
        bundle_post = create(:installment, link: bundle, seller:, published_at: 2.days.ago)
        product_a_post = create(:installment, link: product_a, seller:, published_at: 1.day.ago)
        product_b_post = create(:installment, link: product_b, seller:, published_at: 1.day.ago)

        bundle_email = create(:creator_contacting_customers_email_info, installment: bundle_post, purchase: bundle_purchase)
        product_a_email = create(:creator_contacting_customers_email_info, installment: product_a_post, purchase: bundle_purchase)
        product_b_email = create(:creator_contacting_customers_email_info, installment: product_b_post, purchase: bundle_purchase)

        result = described_class.sent_posts_for(bundle_purchase)

        expect(result).to contain_exactly(bundle_email)
        expect(result).not_to include(product_a_email, product_b_email)
      end

      context "bundle product purchase" do
        it "returns only sent posts for that product, excludes bundle and other product posts" do
          product_a_purchase = bundle_purchase.product_purchases.find_by(link: product_a)

          bundle_post = create(:installment, link: bundle, seller:, published_at: 2.days.ago)
          product_a_post = create(:installment, link: product_a, seller:, published_at: 1.day.ago)
          product_b_post = create(:installment, link: product_b, seller:, published_at: 1.day.ago)

          bundle_email = create(:creator_contacting_customers_email_info, installment: bundle_post, purchase: product_a_purchase)
          product_a_email = create(:creator_contacting_customers_email_info, installment: product_a_post, purchase: product_a_purchase)
          product_b_email = create(:creator_contacting_customers_email_info, installment: product_b_post, purchase: product_a_purchase)

          result = described_class.sent_posts_for(product_a_purchase)

          expect(result).to contain_exactly(product_a_email)
          expect(result).not_to include(bundle_email, product_b_email)
        end
      end
    end
  end
end
