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

    context "with a default offer code" do
      let(:offer_code) { create(:offer_code, user: seller, products: [product]) }

      before do
        product.update!(default_offer_code: offer_code)
      end

      it "includes default_offer_code_id and default_offer_code" do
        props = presenter.props

        expect(props[:product][:default_offer_code_id]).to eq(offer_code.external_id)
        expect(props[:product][:default_offer_code]).to eq({
                                                             id: offer_code.external_id,
                                                             code: offer_code.code,
                                                             name: "",
                                                             discount: offer_code.discount,
                                                           })
      end
    end

    context "without a default offer code" do
      it "returns nil for default_offer_code_id and default_offer_code" do
        props = presenter.props

        expect(props[:product][:default_offer_code_id]).to be_nil
        expect(props[:product][:default_offer_code]).to be_nil
      end
    end
  end
end
