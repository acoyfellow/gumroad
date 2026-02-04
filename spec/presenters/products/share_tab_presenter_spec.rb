# frozen_string_literal: true

require "spec_helper"

RSpec.describe Products::ShareTabPresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:pundit_user) { double("pundit_user") }
  let(:presenter) { described_class.new(product:, pundit_user:) }

  describe "#props" do
    it "returns layout props and share-only product props" do
      props = presenter.props

      expect(props.keys).to include(:id, :unique_permalink, :product, :seller)
      expect(props[:product]).to be_a(Hash)
      expect(props[:product].keys).to include(
        :name, :tags, :taxonomy_id, :display_product_reviews, :is_adult, :custom_domain,
        :price_cents, :variants, :refund_policy, :description, :covers
      )
      expect(props[:product].keys).not_to include(:rich_content)
    end
  end
end
