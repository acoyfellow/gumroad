# frozen_string_literal: true

class SendMissedPostsJob
  include Sidekiq::Job
  sidekiq_options retry: 5, queue: :default, lock: :until_executed

  sidekiq_retry_in do |count, exception|
    case exception
    when SendPostsForPurchaseService::CustomerDNDEnabledError
      Rails.logger.info("[#{self.name}] Discarding job on #{(count + 1).ordinalize} attempt for purchase with DND enabled: #{exception.message}")
      :discard
    when SendPostsForPurchaseService::SellerNotEligibleError
      Rails.logger.info("[#{self.name}] Discarding job on #{(count + 1).ordinalize} attempt for ineligible seller: #{exception.message}")
      :discard
    end
  end

  def perform(purchase_id, workflow_id = nil)
    purchase = Purchase.find(purchase_id)

    SendPostsForPurchaseService.deliver_missed_posts_for!(purchase:, workflow_id:)
  end
end
