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
  end
end
