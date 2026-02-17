# frozen_string_literal: true

require "spec_helper"

describe DuplicateProductWorker do
  describe "#perform" do
    before do
      @product = create(:product, name: "test product")
    end

    it "duplicates product successfully" do
      expect { described_class.new.perform(@product.id) }.to change(Link, :count).by(1)

      expect(Link.exists?(name: "test product (copy)")).to be(true)
    end

    it "sets product is_duplicating to false" do
      @product.update!(is_duplicating: true)

      expect { described_class.new.perform(@product.id) }.to change(Link, :count).by(1)

      expect(@product.reload.is_duplicating).to be(false)
    end

    it "sets product is_duplicating to false on failure" do
      @product.update!(is_duplicating: true)

      expect_any_instance_of(ProductDuplicatorService).to receive(:duplicate).and_raise(StandardError)

      expect { described_class.new.perform(@product.id) }.to_not change(Link, :count)

      expect(@product.reload.is_duplicating).to be(false)
    end

    it "stores the error message on failure" do
      expect_any_instance_of(ProductDuplicatorService).to receive(:duplicate).and_raise(StandardError, "Something broke")

      described_class.new.perform(@product.id)

      expect(ProductDuplicatorService.new(@product.id).recently_failed_error_message).to eq("Something broke")
    end
  end
end
