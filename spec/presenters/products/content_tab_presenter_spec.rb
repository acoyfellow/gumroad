# frozen_string_literal: true

require "spec_helper"

RSpec.describe Products::ContentTabPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:pundit_user) { double("pundit_user") }
  let(:presenter) { described_class.new(product:, pundit_user:) }

  describe "#props" do
    it "returns layout props and content-only product props (no pricing, refund, etc.)" do
      props = presenter.props

      expect(props.keys).to include(:id, :unique_permalink, :product, :seller)
      expect(props[:product]).to be_a(Hash)
      expect(props[:product].keys).to include(:name, :files, :rich_content, :variants, :has_same_rich_content_for_all_variants)
      expect(props[:product].keys).not_to include(:price_cents, :refund_policy, :shipping_destinations)
    end
  end
end
