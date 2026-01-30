# frozen_string_literal: true

class CheckMissedPostsCompletionJob
  include Sidekiq::Job
  sidekiq_options retry: 0, queue: :default

  BACKOFF_STRATEGY = [180, 600, 3600, 7200].freeze

  def perform(purchase_id, workflow_id = nil, retry_count = 0)
    purchase = Purchase.find_by_external_id!(purchase_id)

    if Installment.missed_for_purchase(purchase, workflow_id:).empty?
      CustomersService.clear_missed_posts_job_key(purchase.external_id, workflow_id)
    elsif retry_count < BACKOFF_STRATEGY.length
      CheckMissedPostsCompletionJob.perform_in(
        BACKOFF_STRATEGY[retry_count].seconds,
        purchase_id,
        workflow_id,
        retry_count + 1
      )
    else
      CustomersService.clear_missed_posts_job_key(purchase.external_id, workflow_id)
    end
  end
end
