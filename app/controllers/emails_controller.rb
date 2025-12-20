# frozen_string_literal: true

class EmailsController < Sellers::BaseController
  layout "inertia", only: [:published, :scheduled]

  before_action :set_body_id_as_app, only: [:index]
  before_action :set_installment, only: [:destroy]

  def index
    authorize Installment

    if request.path == emails_path
      if current_seller.installments.alive.not_workflow_installment.scheduled.exists?
        redirect_to scheduled_emails_path, status: :moved_permanently
      else
        redirect_to published_emails_path, status: :moved_permanently
      end
    end
  end

  def published
    authorize Installment, :index?
    create_user_event("emails_view")

    @title = "Published Emails"
    presenter = PaginatedInstallmentsPresenter.new(seller: current_seller, type: Installment::PUBLISHED, page: params[:page], query: params[:query])
    render inertia: "Emails/Published", props: presenter.props
  end

  def scheduled
    authorize Installment, :index?
    create_user_event("emails_view")

    @title = "Scheduled Emails"
    presenter = PaginatedInstallmentsPresenter.new(seller: current_seller, type: Installment::SCHEDULED, page: params[:page], query: params[:query])
    render inertia: "Emails/Scheduled", props: presenter.props
  end

  def destroy
    authorize @installment

    if @installment.mark_deleted
      @installment.installment_rule&.mark_deleted!
      redirect_to emails_path: published_emails_path, notice: "Email deleted!" , status: :see_other
    else
      redirect_to emails_path: published_emails_path, alert: "Sorry, something went wrong. Please try again.", status: :see_other
    end
  end

  private
    def set_installment
      @installment = current_seller.installments.alive.find_by_external_id(params[:id])
      e404 unless @installment
    end
end
