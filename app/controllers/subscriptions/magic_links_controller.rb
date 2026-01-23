# frozen_string_literal: true

class Subscriptions::MagicLinksController < ApplicationController
  before_action :fetch_subscription

  layout "inertia", only: [:new]

  def new
    render inertia: "Subscriptions/MagicLink", props: {
      **Subscriptions::MagicLinkPresenter.new(subscription: @subscription).magic_link_props
    }
  end

  def create
    @subscription.refresh_token

    emails = @subscription.emails
    email_source = params[:email_source].to_sym
    email = emails[email_source]
    e404 if email.nil?

    CustomerMailer.subscription_magic_link(@subscription.id, email).deliver_later(queue: "critical")

    head :no_content
  end

  private
    def fetch_subscription
      @subscription = Subscription.find_by_external_id(params[:id])
      e404 if @subscription.nil?
    end
end
