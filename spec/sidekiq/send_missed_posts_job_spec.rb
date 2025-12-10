# frozen_string_literal: true

require "spec_helper"

describe SendMissedPostsJob do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, seller:, link: product) }
  let(:customer_dnd_enabled_error_message) { "Purchase #{purchase.id} has opted out of receiving emails" }
  let(:seller_not_eligible_error_message) { "You are not eligible to resend this email." }

  describe "#perform" do
    it "finds purchase by ID and calls service" do
      expect(Purchase::PostsService).to receive(:deliver_missed_posts_for!).with(purchase:, workflow_id: nil)

      described_class.new.perform(purchase.id)
    end

    it "raises error when purchase is not found" do
      expect do
        described_class.new.perform(999999)
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "raises CustomerDNDEnabledError when perform is called directly" do
      create(:payment_completed, user: seller)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE)
      create(:installment, link: product, seller:, published_at: 1.day.ago)
      purchase.update!(can_contact: false)

      expect do
        described_class.new.perform(purchase.id)
      end.to raise_error(Purchase::PostsService::CustomerDNDEnabledError, customer_dnd_enabled_error_message)
    end

    it "raises SellerNotEligibleError when perform is called directly" do
      create(:installment, link: product, seller:, published_at: 1.day.ago)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(Installment::MINIMUM_SALES_CENTS_VALUE - 1)

      expect do
        described_class.new.perform(purchase.id)
      end.to raise_error(Purchase::PostsService::SellerNotEligibleError, seller_not_eligible_error_message)
    end
  end

  # NOTE: The sidekiq_retry_in callback that discards the job on
  # Purchase::PostsService::CustomerDNDEnabledError and SellerNotEligibleError exceptions
  # cannot be fully integration tested in Sidekiq's test modes because
  # the retry mechanism doesn't run. We test the callback logic directly instead.
  describe "sidekiq_retry_in callback" do
    let(:callback) { described_class.sidekiq_retry_in_block }

    it "returns :discard and logs for CustomerDNDEnabledError" do
      exception = Purchase::PostsService::CustomerDNDEnabledError.new(customer_dnd_enabled_error_message)

      expect(Rails.logger).to receive(:info)
        .with("[SendMissedPostsJob] Discarding job on 1st attempt for purchase with DND enabled: #{customer_dnd_enabled_error_message}")

      result = callback.call(0, exception)
      expect(result).to eq(:discard)
    end

    it "returns :discard and logs for SellerNotEligibleError" do
      exception = Purchase::PostsService::SellerNotEligibleError.new(seller_not_eligible_error_message)

      expect(Rails.logger).to receive(:info)
        .with("[SendMissedPostsJob] Discarding job on 1st attempt for ineligible seller: #{seller_not_eligible_error_message}")

      result = callback.call(0, exception)
      expect(result).to eq(:discard)
    end

    it "returns nil for other exceptions to allow normal retry" do
      other_exception = StandardError.new("Some error")
      result = callback.call(0, other_exception)
      expect(result).to be_nil
    end
  end
end
