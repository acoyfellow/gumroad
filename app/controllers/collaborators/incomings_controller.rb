# frozen_string_literal: true

class Collaborators::IncomingsController < Sellers::BaseController
  layout "inertia"

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

  private
    def set_title
      @title = "Collaborators"
    end
end
