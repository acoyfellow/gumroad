# frozen_string_literal: true

require "spec_helper"

describe SendPostsForPurchaseService do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, seller:, link: product) }

  describe ".find_missed_posts_for" do
    let!(:sent_post) { create(:installment, link: product, published_at: 2.days.ago) }
    let!(:missed_post1) { create(:installment, link: product, published_at: 1.day.ago) }
    let!(:missed_post2) { create(:installment, link: product, published_at: Time.current) }

    before do
      create(:creator_contacting_customers_email_info, installment: sent_post, purchase:)
    end

    it "returns only posts that haven't been sent" do
      result = described_class.find_missed_posts_for(purchase:)

      expect(result).to include(missed_post1, missed_post2)
      expect(result).not_to include(sent_post)
    end
  end

  describe ".send_post" do
    let(:post) { create(:installment, link: product) }

    before do
      PostSendgridApi.mails.clear
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
        result = described_class.send_post(post:, purchase:)
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
        described_class.send_post(post:, purchase: membership_purchase)
      end.to change { CreatorContactingCustomersEmailInfo.count }.by(1)

      email_info = CreatorContactingCustomersEmailInfo.last
      expect(email_info.purchase_id).to eq(membership_purchase.id)
      expect(PostSendgridApi.mails.size).to eq(1)
      expect(PostSendgridApi.mails.keys).to include(membership_purchase.email)
    end
  end

  describe ".send_missed_posts_for" do
    it "enqueues SendMissedPostsJob with purchase ID" do
      described_class.send_missed_posts_for(purchase:)

      expect(SendMissedPostsJob).to have_enqueued_sidekiq_job(purchase.id).on("default")
    end
  end

  describe ".deliver_missed_posts_for" do
    let!(:sent_post) { create(:installment, link: product, seller:, published_at: 2.days.ago) }
    let!(:missed_post1) { create(:installment, link: product, seller:, published_at: 1.day.ago) }
    let!(:missed_post2) { create(:installment, link: product, seller:, published_at: Time.current) }

    before do
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
        described_class.deliver_missed_posts_for(purchase:)
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
  end
end
