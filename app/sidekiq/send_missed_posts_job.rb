# frozen_string_literal: true

class SendMissedPostsJob
  include Sidekiq::Job
  sidekiq_options retry: 5, queue: :default, lock: :until_executed

  def perform(purchase_id, workflow_id = nil)
    purchase = Purchase.find(purchase_id)

    SendPostsForPurchaseService.deliver_missed_posts_for(purchase:, workflow_id:)
  rescue SendPostsForPurchaseService::CustomerOptedOutError => e
    Rails.logger.info("[#{self.class.name}] Skipping send for opted-out purchase: #{e.message}")
  end
end
