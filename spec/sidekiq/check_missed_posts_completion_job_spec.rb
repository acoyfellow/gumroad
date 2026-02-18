# frozen_string_literal: true

require "spec_helper"

describe CheckMissedPostsCompletionJob do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, seller:, link: product) }

  describe "#perform" do
    it "raises when purchase is not found" do
      expect do
        described_class.new.perform("invalid_external_id")
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    context "when no missed posts remain" do
      before do
        allow(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: nil).and_return([])
      end

      it "clears the Redis key and does not reschedule" do
        expect(CustomersService).to receive(:clear_missed_posts_job_key).with(purchase.external_id, nil)
        expect(described_class).not_to receive(:perform_in)

        described_class.new.perform(purchase.external_id)
      end

      it "clears the Redis key with workflow_id when workflow_id is provided" do
        workflow_id = "workflow_abc"
        allow(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id:).and_return([])

        expect(CustomersService).to receive(:clear_missed_posts_job_key).with(purchase.external_id, workflow_id)
        expect(described_class).not_to receive(:perform_in)

        described_class.new.perform(purchase.external_id, workflow_id)
      end
    end

    context "when missed posts remain and retries are not exhausted" do
      before do
        allow(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: nil).and_return([double])
      end

      it "schedules with 180s backoff when retry_count is 0" do
        expect(described_class).to receive(:perform_in).with(180, purchase.external_id, nil, 1)
        described_class.new.perform(purchase.external_id, nil, 0)
      end

      it "schedules with 600s backoff when retry_count is 1" do
        expect(described_class).to receive(:perform_in).with(600, purchase.external_id, nil, 2)
        described_class.new.perform(purchase.external_id, nil, 1)
      end

      it "schedules with 3600s backoff when retry_count is 2" do
        expect(described_class).to receive(:perform_in).with(3600, purchase.external_id, nil, 3)
        described_class.new.perform(purchase.external_id, nil, 2)
      end

      it "schedules with 7200s backoff when retry_count is 3" do
        expect(described_class).to receive(:perform_in).with(7200, purchase.external_id, nil, 4)
        described_class.new.perform(purchase.external_id, nil, 3)
      end

      it "passes workflow_id when rescheduling" do
        workflow_id = "workflow_xyz"
        allow(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id:).and_return([double])

        expect(described_class).to receive(:perform_in).with(180, purchase.external_id, workflow_id, 1)

        described_class.new.perform(purchase.external_id, workflow_id, 0)
      end
    end

    context "when missed posts remain and retries are exhausted" do
      before do
        allow(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id: nil).and_return([double])
      end

      it "clears the Redis key and does not reschedule" do
        expect(CustomersService).to receive(:clear_missed_posts_job_key).with(purchase.external_id, nil)
        expect(described_class).not_to receive(:perform_in)

        described_class.new.perform(purchase.external_id, nil, described_class::BACKOFF_STRATEGY.length)
      end

      it "clears the Redis key with workflow_id when workflow_id is provided" do
        workflow_id = "workflow_final"
        allow(Installment).to receive(:missed_for_purchase).with(purchase, workflow_id:).and_return([double])

        expect(CustomersService).to receive(:clear_missed_posts_job_key).with(purchase.external_id, workflow_id)
        expect(described_class).not_to receive(:perform_in)

        described_class.new.perform(purchase.external_id, workflow_id, described_class::BACKOFF_STRATEGY.length)
      end
    end
  end
end
