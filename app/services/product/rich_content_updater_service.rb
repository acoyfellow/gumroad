# frozen_string_literal: true

class Product::RichContentUpdaterService
  def initialize(product:, rich_content_params:, seller:)
    @product = product
    @rich_content_params = rich_content_params || []
    @seller = seller
  end

  def perform
    rich_contents_to_keep = []
    existing_rich_contents = product.alive_rich_contents.to_a
    rich_content_params.each.with_index do |node, index|
      rich_content = existing_rich_contents.find { |content| content.external_id == node[:id] } || product.alive_rich_contents.build
      node[:description] = SaveContentUpsellsService.new(
        seller: seller,
        content: node[:description] || node[:content],
        old_content: rich_content.description || []
      ).from_rich_content

      rich_content.update!(
        title: node[:title].presence,
        description: node[:description].presence || [],
        position: index
      )
      rich_contents_to_keep << rich_content
    end
    to_mark_deleted = existing_rich_contents - rich_contents_to_keep
    to_mark_deleted.each(&:mark_deleted!)
    { content_updated: to_mark_deleted.any? || rich_contents_to_keep.any? { _1.previous_changes.key?("id") || _1.previous_changes.key?("title") || _1.previous_changes.key?("description") || _1.previous_changes.key?("position") }, product: }
  end

  private
    attr_reader :product, :rich_content_params, :seller
end
