# frozen_string_literal: true

class SendPostsForPurchaseService
  class CustomerOptedOutError < StandardError; end

  class << self
    def find_missed_posts_for(purchase:, workflow_id: nil)
      result = Installment.missed_for_purchase(purchase)

      if workflow_id.present?
        workflow = purchase.seller.workflows.alive.published.find_by_external_id(workflow_id)
        return Installment.none unless workflow&.applies_to_purchase?(purchase)

        result = result.where(workflow_id: workflow.id)
      end

      result
    end

    def send_post(post:, purchase:)
      raise SendPostsForPurchaseService::CustomerOptedOutError, "Purchase #{purchase.id} has opted out of receiving emails" unless purchase.can_contact?

      # Limit the number of emails sent per post to avoid abuse.
      Rails.cache.fetch("post_email:#{post.id}:#{purchase.id}", expires_in: 8.hours) do
        CreatorContactingCustomersEmailInfo.destroy_by(purchase:, installment: post)

        PostEmailApi.process(
          post:,
          recipients: [{
            email: purchase.email,
            purchase:,
            url_redirect: purchase.url_redirect,
            subscription: purchase.subscription,
          }.compact_blank]
        )
        true
      end
    end

    def send_missed_posts_for(purchase:, workflow_id: nil)
      SendMissedPostsJob.perform_async(purchase.id, workflow_id)
    end

    def deliver_missed_posts_for(purchase:, workflow_id: nil)
      find_missed_posts_for(purchase:, workflow_id:).find_each do |post|
        send_post(post:, purchase:)
      end
    end
  end
end
