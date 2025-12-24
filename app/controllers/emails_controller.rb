# frozen_string_literal: true

class EmailsController < Sellers::BaseController
  layout "inertia"

  before_action :set_installment, only: %i[edit update destroy]

  def index
    authorize Installment

    if current_seller.installments.alive.not_workflow_installment.scheduled.exists?
      redirect_to scheduled_emails_path, status: :moved_permanently
    else
      redirect_to published_emails_path, status: :moved_permanently
    end
  end

  def published
    authorize Installment, :index?
    create_user_event("emails_view")

    presenter = PaginatedInstallmentsPresenter.new(
      seller: current_seller,
      type: Installment::PUBLISHED,
      page: params[:page],
      query: params[:query],
    )
    props = presenter.props
    render inertia: "Emails/Published", props: {
      installments: InertiaRails.merge { props[:installments] },
      pagination: props[:pagination],
      has_posts: props[:has_posts],
    }
  end

  def scheduled
    authorize Installment, :index?
    create_user_event("emails_view")

    presenter = PaginatedInstallmentsPresenter.new(
      seller: current_seller,
      type: Installment::SCHEDULED,
      page: params[:page],
      query: params[:query],
    )
    props = presenter.props
    render inertia: "Emails/Scheduled", props: {
      installments: InertiaRails.merge { props[:installments] },
      pagination: props[:pagination],
      has_posts: props[:has_posts],
    }
  end

  def drafts
    authorize Installment, :index?
    create_user_event("emails_view")

    presenter = PaginatedInstallmentsPresenter.new(
      seller: current_seller,
      type: Installment::DRAFT,
      page: params[:page],
      query: params[:query],
    )
    props = presenter.props
    render inertia: "Emails/Drafts", props: {
      installments: InertiaRails.merge { props[:installments] },
      pagination: props[:pagination],
      has_posts: props[:has_posts],
    }
  end

  def new
    authorize Installment

    presenter = InstallmentPresenter.new(seller: current_seller)
    render inertia: "Emails/New", props: presenter.new_page_props(copy_from: params[:copy_from])
  end

  def edit
    authorize @installment

    presenter = InstallmentPresenter.new(seller: current_seller, installment: @installment)
    render inertia: "Emails/Edit", props: presenter.edit_page_props
  end

  def create
    authorize Installment
    save_installment
  end

  def update
    authorize @installment
    save_installment
  end

  def destroy
    authorize @installment
    @installment.update(deleted_at: Time.current)
    redirect_back_or_to emails_path, notice: "Email deleted!", status: :see_other
  end

  private
    def set_title
      @title = "Emails"
    end

    def set_installment
      @installment = current_seller.installments.alive.find_by_external_id(params[:id])
      e404 unless @installment
    end

    def save_installment
      service = SaveInstallmentService.new(
        seller: current_seller,
        params:,
        installment: @installment,
        preview_email_recipient: impersonating_user || logged_in_user
      )

      is_new_record = @installment.nil?

      if service.process
        notice_message = case params[:save_action_name]
                         when "save_and_preview_post"
                           "Preview link opened."
                         when "save_and_preview_email"
                           "A preview has been sent to your email."
                         when "save_and_publish"
                           service.installment.send_emails? ? "Email successfully sent!" : "Email successfully published!"
                         when "save_and_schedule"
                           "Email successfully scheduled!"
                         else
                           is_new_record ? "Email created!" : "Changes saved!"
        end

        if params[:save_action_name] == "save_and_preview_post"
          redirect_to edit_email_path(service.installment.external_id, preview_post: true), notice: notice_message, status: :see_other
        else
          redirect_to emails_path, notice: notice_message, status: :see_other
        end
      elsif @installment
        redirect_to edit_email_path(@installment.external_id), alert: service.error
      else
        redirect_to new_email_path, alert: service.error
      end
    end
end
