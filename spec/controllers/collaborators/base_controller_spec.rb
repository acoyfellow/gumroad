# frozen_string_literal: true

require "spec_helper"
require "shared_examples/sellers_base_controller_concern"
require "inertia_rails/rspec"

describe Collaborators::BaseController, type: :controller, inertia: true do
  render_views

  it_behaves_like "inherits from Sellers::BaseController"

  controller(Collaborators::BaseController) do
    skip_before_action :authorize_user, only: [:index]

    def index
      skip_authorization
      render inertia: "Collaborators/Index"
    end
  end

  before do
    routes.draw do
      namespace :collaborators do
        get :index, to: "base#index"
      end
    end
  end

  let(:seller) { create(:user) }

  before do
    sign_in seller
  end

  describe "layout" do
    it "uses inertia layout" do
      expect(described_class._layout).to eq("inertia")
    end
  end

  describe "inertia_share" do
    it "shares collaborator presenter props" do
      get :index

      expect(response).to be_successful
      expect(inertia.props[:collaborators_disabled_reason]).to eq(CollaboratorPresenter.new(seller:).inertia_shared_props[:collaborators_disabled_reason])
    end
  end
end
