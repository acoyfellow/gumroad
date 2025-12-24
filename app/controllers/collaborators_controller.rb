# frozen_string_literal: true

class CollaboratorsController < Sellers::BaseController
  before_action :set_collaborator, only: %i[edit update destroy]
  before_action :authorize_collaborator, only: %i[edit update destroy]

  layout "inertia"

  def index
    authorize Collaborator

    collaborators_presenter = CollaboratorsPresenter.new(seller: current_seller)
    render inertia: "Collaborators/Index", props: collaborators_presenter.index_props
  end

  def new
    authorize Collaborator

    collaborator_presenter = CollaboratorPresenter.new(seller: current_seller)
    render inertia: "Collaborators/New", props: collaborator_presenter.new_collaborator_props
  end

  def create
    authorize Collaborator

    response = Collaborator::CreateService.new(seller: current_seller, params: collaborator_params).process

    if response[:success]
      redirect_to collaborators_path, notice: "Collaborator added!", status: :see_other
    else
      redirect_to new_collaborator_path, inertia: { errors: { base: [response[:message]] } }, alert: response[:message]
    end
  end

  def edit
    collaborator_presenter = CollaboratorPresenter.new(seller: current_seller, collaborator: @collaborator)
    render inertia: "Collaborators/Edit", props: collaborator_presenter.edit_collaborator_props
  end

  def update
    response = Collaborator::UpdateService.new(seller: current_seller, collaborator_id: params[:id], params: collaborator_params).process

    if response[:success]
      redirect_to collaborators_path, notice: "Changes saved!", status: :see_other
    else
      redirect_to edit_collaborator_path(@collaborator.external_id), inertia: { errors: { base: [response[:message]] } }, alert: response[:message]
    end
  end

  def destroy
    @collaborator.mark_deleted!

    if current_seller == @collaborator.seller
      AffiliateMailer.collaboration_ended_by_seller(@collaborator.id).deliver_later
    elsif current_seller == @collaborator.affiliate_user
      AffiliateMailer.collaboration_ended_by_affiliate_user(@collaborator.id).deliver_later
    end

    redirect_to collaborators_path, notice: "Collaborator removed!", status: :see_other
  end

  private
    def set_title
      @title = "Collaborators"
    end

    def set_collaborator
      @collaborator = Collaborator.alive.find_by_external_id(params[:id]) || e404
    end

    def authorize_collaborator
      authorize @collaborator
    end

    def collaborator_params
      params.require(:collaborator).permit(:email, :apply_to_all_products, :percent_commission, :dont_show_as_co_creator, products: [:id, :percent_commission, :dont_show_as_co_creator])
    end
end
