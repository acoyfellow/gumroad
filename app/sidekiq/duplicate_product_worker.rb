# frozen_string_literal: true

class DuplicateProductWorker
  include Sidekiq::Job
  sidekiq_options queue: :critical

  def perform(product_id)
    ProductDuplicatorService.new(product_id).duplicate
  rescue => e
    logger.error("Error while duplicating product id '#{product_id}': #{e.inspect}")
    Bugsnag.notify(e)
    error_message = e.is_a?(ActiveRecord::RecordInvalid) ? e.record.errors.full_messages.first : e.message
    ProductDuplicatorService.new(product_id).store_duplication_error(error_message)
  ensure
    product = Link.find(product_id)
    product.is_duplicating = false
    product.save!(validate: false)
  end
end
