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
end
