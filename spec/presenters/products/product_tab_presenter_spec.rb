# frozen_string_literal: true

require "spec_helper"

RSpec.describe Products::ProductTabPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:pundit_user) { double("pundit_user") }
  let(:presenter) { described_class.new(product:, pundit_user:) }

  describe "#props" do
    it "returns layout props and full product tab product props" do
      props = presenter.props

      expect(props.keys).to include(:id, :unique_permalink, :product, :seller)
      expect(props[:product]).to be_a(Hash)
      expect(props[:product].keys).to include(:name, :price_cents, :variants, :refund_policy, :custom_attributes, :shipping_destinations)
    end
  end
end
