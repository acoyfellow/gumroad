# frozen_string_literal: true

require "spec_helper"

RSpec.describe CustomersChannel do
  let(:user) { create(:user) }
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let!(:purchase) { create(:purchase, seller:, link: product) }

  describe "#subscribed" do
    before do
      stub_connection current_user: user
    end

    context "when user has access to purchase" do
      it "subscribes to the customers channel" do
        stub_connection current_user: seller

        policy_instance = nil
        allow(Audience::PurchasePolicy).to receive(:new).and_wrap_original do |method, *args|
          policy_instance = method.call(*args)
          allow(policy_instance).to receive(:send_missed_posts?).and_call_original
          policy_instance
        end

        subscribe purchase_id: purchase.external_id

        expect(Audience::PurchasePolicy).to have_received(:new)
        expect(policy_instance).to have_received(:send_missed_posts?)
        expect(subscription).to be_confirmed
        expect(subscription).to have_stream_from("customers:user_#{seller.external_id}")
      end
    end

    context "when purchase is not found" do
      it "rejects subscription" do
        subscribe purchase_id: "non_existent_id"
        expect(subscription).to be_rejected

        subscribe purchase_id: nil
        expect(subscription).to be_rejected
      end
    end
  end

  describe ".broadcast_missed_posts_message!" do
    let(:workflow) { create(:workflow, seller:, link: product, name: "Test Workflow", published_at: Time.current) }

    it "broadcasts complete message with workflow name when workflow_id is provided" do
      expect(described_class).to receive(:broadcast_to).with(
        "user_#{seller.external_id}",
        {
          type: described_class::MISSED_POSTS_JOB_COMPLETE_TYPE,
          purchase_id: purchase.external_id,
          workflow_id: workflow.external_id,
          message: "Missed emails for workflow \"Test Workflow\" were sent to #{purchase.email}"
        }
      )

      described_class.broadcast_missed_posts_message!(
        purchase.external_id,
        workflow.external_id,
        described_class::MISSED_POSTS_JOB_COMPLETE_TYPE
      )
    end

    it "broadcasts complete message with default workflow name when workflow_id is nil" do
      expect(described_class).to receive(:broadcast_to).with(
        "user_#{seller.external_id}",
        {
          type: described_class::MISSED_POSTS_JOB_COMPLETE_TYPE,
          purchase_id: purchase.external_id,
          message: "Missed emails for workflow \"All missed emails\" were sent to #{purchase.email}"
        }
      )

      described_class.broadcast_missed_posts_message!(
        purchase.external_id,
        nil,
        described_class::MISSED_POSTS_JOB_COMPLETE_TYPE
      )
    end

    it "broadcasts failure message with workflow name when workflow_id is provided" do
      expect(described_class).to receive(:broadcast_to).with(
        "user_#{seller.external_id}",
        {
          type: described_class::MISSED_POSTS_JOB_FAILED_TYPE,
          purchase_id: purchase.external_id,
          workflow_id: workflow.external_id,
          message: "Failed to send missed emails for workflow \"Test Workflow\" to #{purchase.email}. Please try again in some time."
        }
      )

      described_class.broadcast_missed_posts_message!(
        purchase.external_id,
        workflow.external_id,
        described_class::MISSED_POSTS_JOB_FAILED_TYPE
      )
    end

    it "broadcasts failure message with default workflow name when workflow_id is nil" do
      expect(described_class).to receive(:broadcast_to).with(
        "user_#{seller.external_id}",
        {
          type: described_class::MISSED_POSTS_JOB_FAILED_TYPE,
          purchase_id: purchase.external_id,
          message: "Failed to send missed emails for workflow \"All missed emails\" to #{purchase.email}. Please try again in some time."
        }
      )

      described_class.broadcast_missed_posts_message!(
        purchase.external_id,
        nil,
        described_class::MISSED_POSTS_JOB_FAILED_TYPE
      )
    end

    it "logs error, notifies Bugsnag, and raises when broadcast_to fails" do
      error = StandardError.new("Redis connection failed")

      allow(described_class).to receive(:broadcast_to).and_raise(error)
      allow(Rails.logger).to receive(:error)
      allow(Bugsnag).to receive(:notify)

      expect do
        described_class.broadcast_missed_posts_message!(purchase.external_id, workflow.external_id, described_class::MISSED_POSTS_JOB_COMPLETE_TYPE)
      end.to raise_error(StandardError, "Redis connection failed")

      expect(Rails.logger).to have_received(:error).with("Failed to broadcast message to customers channel: Redis connection failed")
      expect(Bugsnag).to have_received(:notify).with(error)
    end
  end
end
