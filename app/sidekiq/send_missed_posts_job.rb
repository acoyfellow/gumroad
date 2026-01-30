# frozen_string_literal: true

class SendMissedPostsJob
  include Sidekiq::Job
  sidekiq_options retry: 5, queue: :default, lock: :until_executed

  def perform(purchase_id, workflow_id = nil)
    purchase = Purchase.find_by_external_id!(purchase_id)
    CheckMissedPostsCompletionJob.perform_in(60.seconds, purchase_id, workflow_id)
    CustomersService.deliver_missed_posts_for!(purchase:, workflow_id:)
  end

  RetryHandler = ->(count, exception, msg) do
    case exception
    when CustomersService::CustomerDNDEnabledError
      Rails.logger.info("[SendMissedPostsJob] Discarding job on #{(count + 1).ordinalize} attempt for purchase with DND enabled: #{exception.message}")
      :discard
    when CustomersService::SellerNotEligibleError
      Rails.logger.info("[SendMissedPostsJob] Discarding job on #{(count + 1).ordinalize} attempt for ineligible seller: #{exception.message}")
      :discard
    end
  end

  sidekiq_retry_in(&RetryHandler)
end
