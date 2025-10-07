# frozen_string_literal: true

class Admin::ActionCallDashboardController < Admin::BaseController
  include Pagy::Backend

  layout "admin_inertia", only: :show

  RECORDS_PER_PAGE = 15

  def show
    @title = "Action Call Dashboard"

    pagination, admin_action_call_infos = pagy(
      AdminActionCallInfo.order(call_count: :desc, controller_name: :asc, action_name: :asc),
      limit: params[:per_page] || RECORDS_PER_PAGE,
      page: params[:page]
    )

    render inertia: "Admin/ActionCallDashboard/Show",
           props: { admin_action_call_infos:, pagination: }
  end
end
