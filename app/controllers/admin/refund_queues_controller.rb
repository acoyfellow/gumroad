# frozen_string_literal: true

class Admin::RefundQueuesController < Admin::BaseController
  include Pagy::Backend

  layout "admin_inertia"

  def show
    @title = "Refund queue"

    pagination, users = pagy_countless(
      User.refund_queue
          .includes(
            :admin_manageable_user_memberships,
            :payments
          )
          .with_blocked_attributes_for(:form_email, :form_email_domain),
      limit: params[:per_page] || 3,
      page: params[:page],
      max_items: User::Risk::MAX_REFUND_QUEUE_SIZE,
      countless_minimal: true
    )

    render  inertia: "Admin/RefundQueues/Show",
            props: {
              users: InertiaRails.merge { users.map do |user|
                user.as_json(
                  admin: true,
                  impersonatable: policy([:admin, :impersonators, user]).create?
                )
              end },
              pagination:
            }
  end
end
