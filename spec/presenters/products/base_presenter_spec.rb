# frozen_string_literal: true

require "spec_helper"

RSpec.describe Products::BasePresenter do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:pundit_user) { double("pundit_user") }
  let(:presenter) { described_class.new(product:, pundit_user:) }

  describe "#layout_props" do
    it "returns top-level props without product" do
      props = presenter.layout_props

      expect(props).to include(:id, :unique_permalink, :seller, :currency_type, :taxonomies, :thumbnail)
      expect(props).not_to have_key(:product)
    end
  end

  describe "#product_minimal_props" do
    it "returns only name, is_published, files, native_type" do
      props = presenter.product_minimal_props

      expect(props.keys).to contain_exactly(:name, :is_published, :files, :native_type)
    end
  end
end
