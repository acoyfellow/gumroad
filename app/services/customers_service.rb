# frozen_string_literal: true

class CustomersService
  class CustomerDNDEnabledError < StandardError; end
  class PostNotSentError < StandardError; end
  class SellerNotEligibleError < StandardError; end

  POST_EMAIL_CACHE_EXPIRATION_TIME = 8.hours

  class << self
    def send_post!(post:, purchase:)
      validate_email_sending_eligibility_for!(purchase.seller)
      validate_customer_can_be_contacted_via_email_for!(purchase)

      # Limit the number of emails sent per post to avoid abuse.
      Rails.cache.fetch("post_email:#{post.id}:#{purchase.id}", expires_in: POST_EMAIL_CACHE_EXPIRATION_TIME) do
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

    def send_missed_posts_for!(purchase:, workflow_id: nil)
      validate_email_sending_eligibility_for!(purchase.seller)
      validate_customer_can_be_contacted_via_email_for!(purchase)

      $redis.setex(RedisKey.missed_posts_job(purchase.external_id, workflow_id || "all"), 3.days.to_i, "1")
      SendMissedPostsJob.perform_async(purchase.external_id, workflow_id)
    end

    def missed_posts_job_in_progress?(purchase_id, workflow_id)
      return true if $redis.exists?(RedisKey.missed_posts_job(purchase_id, "all"))
      if workflow_id.blank?
        $redis.scan_each(match: RedisKey.missed_posts_job(purchase_id, "*"), count: 100).any?
      else
        $redis.exists?(RedisKey.missed_posts_job(purchase_id, workflow_id))
      end
    end

    def clear_missed_posts_job_key(purchase_id, workflow_id = "all")
      $redis.del(RedisKey.missed_posts_job(purchase_id, workflow_id))
    end

    def deliver_missed_posts_for!(purchase:, workflow_id: nil)
      Installment.missed_for_purchase(purchase, workflow_id:).find_each do |post|
        send_post!(post:, purchase:)
      rescue CustomerDNDEnabledError, SellerNotEligibleError => e
        raise e
      rescue StandardError => e
        raise PostNotSentError, "Missed post #{post.id} could not be sent. Aborting batch sending for the remaining posts. Original message: #{e.message}", e.backtrace
      end
    end

    private
      def validate_email_sending_eligibility_for!(seller)
        raise SellerNotEligibleError, "You are not eligible to resend this email." unless seller.eligible_to_send_emails?
      end

      def validate_customer_can_be_contacted_via_email_for!(purchase)
        raise CustomerDNDEnabledError, "Purchase #{purchase.id} has opted out of receiving emails" unless purchase.can_contact?
      end
  end
end
