# frozen_string_literal: true

class SendPostsForPurchaseService
  class << self
    def find_missed_posts_for(purchase:)
      Installment.missed_for_purchase(purchase)
    end

    def send_post(post:, purchase:)
      # Limit the number of emails sent per post to avoid abuse.
      Rails.cache.fetch("post_email:#{post.id}:#{purchase.id}", expires_in: 8.hours) do
        CreatorContactingCustomersEmailInfo.where(purchase:, installment: post).destroy_all

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

    def send_missed_posts_for(purchase:)
      SendMissedPostsJob.perform_async(purchase.id)
    end

    def deliver_missed_posts_for(purchase:)
      find_missed_posts_for(purchase:).find_each do |post|
        send_post(post:, purchase:)
      end
    end
  end
end
