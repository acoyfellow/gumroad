# frozen_string_literal: true

require "spec_helper"
require "shared_examples/sellers_base_controller_concern"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe CollaboratorsController, inertia: true do
  it_behaves_like "inherits from Sellers::BaseController"

  let(:seller) { create(:user) }

  describe "GET index" do
    before do
      sign_in seller
    end

    it "renders the index template with props" do
      get :index
      expect(response).to be_successful
      expect(inertia.component).to eq("Collaborators/Index")
      expect(inertia.props).to include(:collaborators, :collaborators_disabled_reason, :has_incoming_collaborators)
    end
  end

  describe "GET new" do
    before do
      sign_in seller
    end

    it "renders the new template" do
      get :new
      expect(response).to be_successful
      expect(inertia.component).to eq("Collaborators/New")
      expect(inertia.props).to include(:products, :collaborators_disabled_reason)
    end
  end

  describe "GET edit" do
    let(:affiliate_user) { create(:user) }
    let!(:collaborator) { create(:collaborator, seller:, affiliate_user:) }

    before do
      sign_in seller
    end

    it "renders the edit template" do
      get :edit, params: { id: collaborator.external_id }
      expect(response).to be_successful
      expect(inertia.component).to eq("Collaborators/Edit")
      expect(inertia.props[:id]).to eq(collaborator.external_id)
      expect(inertia.props).to include(:products, :collaborators_disabled_reason)
    end

    it "returns 404 for non-existent collaborator" do
      expect do
        get :edit, params: { id: "nonexistent" }
      end.to raise_error(ActionController::RoutingError)
    end
  end

  describe "POST create" do
    let(:affiliate_user) { create(:user) }
    let(:product) { create(:product, user: seller) }

    before do
      sign_in seller
    end

    it "redirects to collaborators index on success" do
      allow(Collaborator::CreateService).to receive(:new).and_return(
        double(process: { success: true })
      )

      post :create, params: {
        collaborator: {
          email: affiliate_user.email,
          apply_to_all_products: true,
          percent_commission: 30,
          dont_show_as_co_creator: false,
          products: [{ id: product.external_id, percent_commission: 30, dont_show_as_co_creator: false }]
        }
      }

      expect(response).to redirect_to(collaborators_path)
      expect(flash[:notice]).to eq("Collaborator added!")
    end

    it "redirects back to new with errors on failure" do
      allow(Collaborator::CreateService).to receive(:new).and_return(
        double(process: { success: false, message: "Invalid email" })
      )

      post :create, params: {
        collaborator: {
          email: "invalid@example.com",
          apply_to_all_products: true,
          percent_commission: 30,
          products: []
        }
      }

      expect(response).to redirect_to(new_collaborator_path)
      expect(flash[:alert]).to eq("Invalid email")
    end
  end

  describe "PATCH update" do
    let(:affiliate_user) { create(:user) }
    let!(:collaborator) { create(:collaborator, seller:, affiliate_user:) }

    before do
      sign_in seller
    end

    it "redirects to collaborators index on success" do
      allow(Collaborator::UpdateService).to receive(:new).and_return(
        double(process: { success: true })
      )

      patch :update, params: {
        id: collaborator.external_id,
        collaborator: {
          apply_to_all_products: true,
          percent_commission: 40,
          dont_show_as_co_creator: false,
          products: []
        }
      }

      expect(response).to redirect_to(collaborators_path)
      expect(flash[:notice]).to eq("Changes saved!")
    end

    it "redirects back to edit with errors on failure" do
      allow(Collaborator::UpdateService).to receive(:new).and_return(
        double(process: { success: false, message: "Update failed" })
      )

      patch :update, params: {
        id: collaborator.external_id,
        collaborator: {
          apply_to_all_products: true,
          percent_commission: 40,
          products: []
        }
      }

      expect(response).to redirect_to(edit_collaborator_path(collaborator.external_id))
      expect(flash[:alert]).to eq("Update failed")
    end
  end

  describe "DELETE destroy" do
    let(:affiliate_user) { create(:user) }
    let!(:collaborator) { create(:collaborator, seller:, affiliate_user:) }

    before do
      sign_in seller
    end

    it "removes the collaborator and redirects" do
      expect do
        delete :destroy, params: { id: collaborator.external_id }
      end.to change { collaborator.reload.deleted_at }.from(nil)

      expect(response).to redirect_to(collaborators_path)
      expect(flash[:notice]).to eq("Collaborator removed!")
    end

    it "sends email notification when seller ends collaboration" do
      expect do
        delete :destroy, params: { id: collaborator.external_id }
      end.to have_enqueued_mail(AffiliateMailer, :collaboration_ended_by_seller)
    end
  end
end
