# frozen_string_literal: true

require "spec_helper"

describe SendMissedPostsJob do
  describe "#perform" do
    let(:seller) { create(:named_seller) }
    let(:product) { create(:product, user: seller) }
    let(:purchase) { create(:purchase, seller:, link: product) }

    it "finds purchase by ID and calls service" do
      expect(SendPostsForPurchaseService).to receive(:deliver_missed_posts_for).with(purchase:, workflow_id: nil)

      described_class.new.perform(purchase.id)
    end

    it "raises error when purchase is not found" do
      expect do
        described_class.new.perform(999999)
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "handles CustomerOptedOutError gracefully without retrying" do
      error_message = "Purchase #{purchase.id} has opted out of receiving emails"
      expect(SendPostsForPurchaseService).to receive(:deliver_missed_posts_for).with(purchase:, workflow_id: nil)
        .and_raise(SendPostsForPurchaseService::CustomerOptedOutError.new(error_message))

      expect(Rails.logger).to receive(:info).with("[SendMissedPostsJob] Skipping send for opted-out purchase: #{error_message}")

      expect do
        described_class.new.perform(purchase.id)
      end.not_to raise_error
    end
  end
end
