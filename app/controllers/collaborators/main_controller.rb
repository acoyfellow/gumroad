# frozen_string_literal: true

class Collaborators::MainController < Collaborators::BaseController
  prepend_before_action :set_collaborator, only: %i[edit update destroy]

  def index
    render_index_props
  end

  def new
    @title = "New collaborator"
    render inertia: "Collaborators/New", props: CollaboratorPresenter.new(seller: current_seller).new_collaborator_props
  end

  def create
    response = Collaborator::CreateService.new(seller: current_seller, params: collaborator_params).process

    if response[:success]
      redirect_to collaborators_path, status: :see_other, notice: "Changes saved!"
    else
      redirect_to new_collaborator_path, inertia: { errors: { message: response[:message] } }
    end
  end

  def edit
    @title = "Edit collaborator"
    render inertia: "Collaborators/Edit", props: CollaboratorPresenter.new(seller: current_seller, collaborator: @collaborator).edit_collaborator_props
  end

  def update
    response = Collaborator::UpdateService.new(seller: current_seller, collaborator_id: params[:id], params: collaborator_params).process

    if response[:success]
      redirect_to collaborators_path, status: :see_other, notice: "Changes saved!"
    else
      redirect_to edit_collaborator_path(params[:id]), inertia: { errors: { message: response[:message] } }
    end
  end

  def destroy
    super do
      redirect_to collaborators_path, status: :see_other, notice: "The collaborator was removed successfully."
    end
  end

  private
    def collaborator_params
      params.require(:collaborator).permit(:email, :apply_to_all_products, :percent_commission, :dont_show_as_co_creator, products: [:id, :percent_commission, :dont_show_as_co_creator])
    end

    def render_index_props
      @title = "Collaborators"
      render inertia: "Collaborators/Index", props: CollaboratorsPresenter.new(seller: current_seller).index_props
    end
end
