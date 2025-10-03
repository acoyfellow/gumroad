# frozen_string_literal: true

require "spec_helper"
require "shared_examples/admin_base_controller_concern"

describe Admin::Search::UsersController do
  render_views

  it_behaves_like "inherits from Admin::BaseController"

  before do
    sign_in create(:admin_user)
  end

  describe "#index" do
    let!(:john) { create(:user, name: "John Doe", email: "johnd@gmail.com") }
    let!(:mary) { create(:user, name: "Mary Doe", email: "maryd@gmail.com", external_id: "12345") }
    let!(:derek) { create(:user, name: "Derek Sivers", email: "derek@sive.rs") }
    let!(:jane) { create(:user, name: "Jane Sivers", email: "jane@sive.rs") }

    it "searches for users with exact email" do
      get :users, params: { query: "johnd@gmail.com" }
      expect(response).to redirect_to admin_user_path(john)
    end

    it "searches for users with external_id" do
      get :users, params: { query: "12345" }
      expect(response).to redirect_to admin_user_path(mary)
    end

    it "searches for users with partial email" do
      get :users, params: { query: "sive.rs" }
      expect(response.body).to include("Derek Sivers")
      expect(response.body).to include("Jane Sivers")
    end

    it "searches for users with partial name" do
      get :users, params: { query: "doe" }
      expect(response.body).to include("John Doe")
      expect(response.body).to include("Mary Doe")
    end
  end
end
