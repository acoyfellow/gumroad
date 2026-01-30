# frozen_string_literal: true

require "spec_helper"

module Products
  module Edit
    RSpec.describe ShareTabPresenter do
      let(:seller) { create(:named_seller) }
      let(:product) { create(:product, user: seller) }
      let(:pundit_user) { double("pundit_user") }
      let(:presenter) { described_class.new(product:, pundit_user:) }

      describe "#props" do
        it "returns layout props and share-only product props" do
          props = presenter.props

          expect(props.keys).to include(:id, :unique_permalink, :product, :seller)
          expect(props[:product]).to be_a(Hash)
          expect(props[:product].keys).to include(:name, :tags, :taxonomy_id, :display_product_reviews, :is_adult, :custom_domain)
          expect(props[:product].keys).not_to include(:price_cents, :variants, :rich_content, :refund_policy)
        end
      end
    end
  end
end
