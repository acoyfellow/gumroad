# frozen_string_literal: true

class Collaborators::IncomingsController < Sellers::BaseController
  layout "inertia"

  before_action :set_collaborator, only: [:accept, :decline, :destroy]
  before_action :set_invitation!, only: [:accept, :decline]

  def index
    authorize Collaborator

    incoming_collaborators = Collaborator
      .alive
      .where(affiliate_user: current_seller)
      .includes(
        :collaborator_invitation,
        :seller,
        product_affiliates: :product
      )

    collaborators_presenter = CollaboratorsPresenter.new(seller: current_seller)
    render inertia: "Collaborators/Incomings/Index", props: collaborators_presenter.incomings_index_props(incoming_collaborators)
  end

  def accept
    authorize @invitation, :accept?

    @invitation.accept!

    redirect_to collaborators_incomings_path, status: :see_other, notice: "Invitation accepted"
  end

  def decline
    authorize @invitation, :decline?

    @invitation.decline!

    redirect_to collaborators_incomings_path, status: :see_other, notice: "Invitation declined"
  end

  def destroy
    authorize @collaborator

    @collaborator.mark_deleted!

    redirect_to collaborators_incomings_path, status: :see_other, notice: "Collaborator removed"
  end

  private
    def set_title
      @title = "Collaborators"
    end

    def set_collaborator
      @collaborator = Collaborator.alive.find_by_external_id!(params[:id])
    end

    def set_invitation!
      raise ActiveRecord::RecordNotFound unless @collaborator.present?
      @invitation = @collaborator.collaborator_invitation || e404
    end
end
