# frozen_string_literal: true

require "spec_helper"

describe Product::RichContentUpdaterService do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }

  describe "#perform" do
    it "saves the rich content pages in the given order" do
      updated_rich_content1_description = [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }, { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "World" }] }]
      new_rich_content_description = [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Newly added" }] }]
      rich_content1 = create(:product_rich_content, title: "p1", position: 0, entity: product, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }])
      rich_content2 = create(:product_rich_content, title: "p2", position: 1, entity: product, deleted_at: 1.day.ago)
      rich_content3 = create(:product_rich_content, title: "p3", position: 2, entity: product)
      rich_content4 = create(:product_rich_content, title: "p4", position: 3, entity: product)
      another_product_rich_content = create(:product_rich_content)

      expect(product.alive_rich_contents.sort_by(&:position).pluck(:title, :position)).to eq([["p1", 0], ["p3", 2], ["p4", 3]])

      rich_content_params = [
        { id: rich_content4.external_id, title: "Intro", description: [{ "type" => "paragraph" }] },
        { id: rich_content1.external_id, title: "Page 1", description: updated_rich_content1_description },
        { title: "Page 2", description: new_rich_content_description },
        { title: "Page 3", description: nil },
      ]

      result = described_class.new(product:, rich_content_params:, seller:).perform

      expect(result[:content_updated]).to be(true)
      expect(result[:product]).to eq(product)
      expect(rich_content1.reload.deleted?).to be(false)
      expect(rich_content1.description).to eq(updated_rich_content1_description)
      expect(rich_content2.reload.deleted?).to be(true)
      expect(rich_content3.reload.deleted?).to be(true)
      expect(rich_content4.reload.deleted?).to be(false)
      expect(another_product_rich_content.reload.deleted?).to be(false)
      expect(product.reload.rich_contents.count).to eq(6)
      expect(product.alive_rich_contents.count).to eq(4)
      new_rich_content = product.alive_rich_contents.second_to_last
      expect(new_rich_content.description).to eq(new_rich_content_description)
      expect(product.alive_rich_contents.sort_by(&:position).pluck(:title, :position)).to eq([["Intro", 0], ["Page 1", 1], ["Page 2", 2], ["Page 3", 3]])

      empty_result = nil
      expect do
        empty_result = described_class.new(product:, rich_content_params: [], seller:).perform
      end.to change { product.reload.alive_rich_contents.count }.from(4).to(0)
        .and change { product.rich_contents.count }.by(0)
      expect(empty_result[:content_updated]).to be(true)
      expect(empty_result[:product]).to eq(product)
    end

    context "content_updated" do
      it "returns content_updated true when only description changes" do
        rich_content = create(:product_rich_content, entity: product, title: "Page title", position: 0, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Original content" }] }])
        rich_content_params = [{ id: rich_content.external_id, title: "Page title", description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "New content" }] }] }]

        expect(SaveContentUpsellsService).to receive(:new).with(
          seller: product.user,
          content: [
            { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "New content" }] }
          ],
          old_content: [
            { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Original content" }] }
          ]
        ).and_call_original

        result = described_class.new(product:, rich_content_params:, seller:).perform
        expect(result[:content_updated]).to be(true)
        expect(result[:product]).to eq(product)
      end

      it "returns content_updated true when only a new page is added" do
        rc = create(:product_rich_content, entity: product, title: "Existing", position: 0, description: [])
        rich_content_params = [
          { id: rc.external_id, title: "Existing", description: [] },
          { title: "New page", description: [] },
        ]

        result = described_class.new(product:, rich_content_params:, seller:).perform
        expect(result[:content_updated]).to be(true)
        expect(product.alive_rich_contents.count).to eq(2)
        expect(product.alive_rich_contents.pluck(:title)).to contain_exactly("Existing", "New page")
      end
      context "with two pages" do
        let!(:rc1) { create(:product_rich_content, entity: product, title: "Page 1", position: 0, description: []) }
        let!(:rc2) { create(:product_rich_content, entity: product, title: "Page 2", position: 1, description: []) }

        it "returns content_updated false when nothing changes" do
          rich_content_params = [{ id: rc1.external_id, title: "Page 1", description: [] }, { id: rc2.external_id, title: "Page 2", description: [] }]
          result = described_class.new(product:, rich_content_params:, seller:).perform
          expect(result[:content_updated]).to be(false)
          expect(result[:product]).to eq(product)
        end

        it "returns content_updated true when only title changes" do
          rich_content_params = [{ id: rc1.external_id, title: "New title", description: [] }, { id: rc2.external_id, title: "Page 2", description: [] }]
          result = described_class.new(product:, rich_content_params:, seller:).perform
          expect(result[:content_updated]).to be(true)
          expect(rc1.reload.title).to eq("New title")
        end

        it "returns content_updated true when only position changes" do
          rich_content_params = [{ id: rc2.external_id, title: "Page 2", description: [] }, { id: rc1.external_id, title: "Page 1", description: [] }]
          result = described_class.new(product:, rich_content_params:, seller:).perform
          expect(result[:content_updated]).to be(true)
          expect(product.alive_rich_contents.sort_by(&:position).pluck(:title, :position)).to eq([["Page 2", 0], ["Page 1", 1]])
        end

        it "returns content_updated true when only a page is removed" do
          rich_content_params = [{ id: rc1.external_id, title: "Page 1", description: [] }]
          result = described_class.new(product:, rich_content_params:, seller:).perform
          expect(result[:content_updated]).to be(true)
          expect(rc1.reload).to be_alive
          expect(rc2.reload).to be_deleted
        end
      end
    end
  end
end
