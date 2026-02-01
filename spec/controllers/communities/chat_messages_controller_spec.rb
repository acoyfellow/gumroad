# frozen_string_literal: true

require "spec_helper"

describe Communities::ChatMessagesController do
  let(:seller) { create(:user) }
  let(:product) { create(:product, user: seller, community_chat_enabled: true, price_cents: 0) }
  let!(:community) { create(:community, resource: product, seller: seller) }

  before do
    Feature.activate_user(:communities, seller)
  end

  describe "GET #index" do
    context "when logged in as a user with access" do
      let(:buyer) { create(:user) }
      let!(:purchase) { create(:free_purchase, seller: seller, purchaser: buyer, link: product) }

      before do
        sign_in(buyer)
      end

      it "returns chat messages" do
        create(:community_chat_message, community: community, user: seller, content: "Hello!")

        get :index, params: { community_id: community.external_id, timestamp: Time.current.iso8601, fetch_type: "older" }

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json["messages"].length).to eq(1)
        expect(json["messages"][0]["content"]).to eq("Hello!")
      end
    end

    context "when logged in as a user without access" do
      let(:other_user) { create(:user) }

      before do
        sign_in(other_user)
      end

      it "returns not found" do
        get :index, params: { community_id: community.external_id }

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe "POST #create" do
    context "when logged in as a user with access" do
      let(:buyer) { create(:user) }
      let!(:purchase) { create(:free_purchase, seller: seller, purchaser: buyer, link: product) }

      before do
        sign_in(buyer)
      end

      it "creates a chat message" do
        expect do
          post :create, params: {
            community_id: community.external_id,
            community_chat_message: { content: "Hello, world!" }
          }
        end.to change(CommunityChatMessage, :count).by(1)

        expect(response).to redirect_to(community_path(seller.external_id, community.external_id))
        expect(response).to have_http_status(:see_other)

        message = CommunityChatMessage.last
        expect(message.content).to eq("Hello, world!")
        expect(message.user).to eq(buyer)
        expect(message.community).to eq(community)
      end

      it "redirects with error for invalid content" do
        post :create, params: {
          community_id: community.external_id,
          community_chat_message: { content: "" }
        }

        expect(response).to redirect_to(community_path(seller.external_id, community.external_id))
      end
    end
  end

  describe "PUT #update" do
    let(:buyer) { create(:user) }
    let!(:purchase) { create(:purchase, seller: seller, purchaser: buyer, link: product) }
    let!(:message) { create(:community_chat_message, community: community, user: buyer, content: "Original") }

    context "when logged in as the message author" do
      before do
        sign_in(buyer)
      end

      it "updates the message" do
        put :update, params: {
          community_id: community.external_id,
          id: message.external_id,
          community_chat_message: { content: "Updated content" }
        }

        expect(response).to redirect_to(community_path(seller.external_id, community.external_id))
        expect(response).to have_http_status(:see_other)
        expect(message.reload.content).to eq("Updated content")
      end
    end

    context "when logged in as a different user" do
      let(:other_buyer) { create(:user) }
      let!(:other_purchase) { create(:free_purchase, seller: seller, purchaser: other_buyer, link: product) }

      before do
        sign_in(other_buyer)
      end

      it "returns not found" do
        put :update, params: {
          community_id: community.external_id,
          id: message.external_id,
          community_chat_message: { content: "Updated content" }
        }

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe "DELETE #destroy" do
    let(:buyer) { create(:user) }
    let!(:purchase) { create(:purchase, seller: seller, purchaser: buyer, link: product) }
    let!(:message) { create(:community_chat_message, community: community, user: buyer, content: "To be deleted") }

    context "when logged in as the message author" do
      before do
        sign_in(buyer)
      end

      it "soft deletes the message" do
        delete :destroy, params: {
          community_id: community.external_id,
          id: message.external_id
        }

        expect(response).to redirect_to(community_path(seller.external_id, community.external_id))
        expect(response).to have_http_status(:see_other)
        expect(message.reload).to be_deleted
      end
    end

    context "when logged in as the community seller" do
      before do
        sign_in(seller)
      end

      it "allows seller to delete any message" do
        delete :destroy, params: {
          community_id: community.external_id,
          id: message.external_id
        }

        expect(response).to redirect_to(community_path(seller.external_id, community.external_id))
        expect(response).to have_http_status(:see_other)
        expect(message.reload).to be_deleted
      end
    end
  end

  describe "POST #mark_read" do
    let(:buyer) { create(:user) }
    let!(:purchase) { create(:purchase, seller: seller, purchaser: buyer, link: product) }
    let!(:message) { create(:community_chat_message, community: community, user: seller, content: "Read me") }

    before do
      sign_in(buyer)
    end

    it "marks the message as read" do
      expect do
        post :mark_read, params: {
          community_id: community.external_id,
          message_id: message.external_id
        }
      end.to change(LastReadCommunityChatMessage, :count).by(1)

      expect(response).to have_http_status(:ok)

      last_read = LastReadCommunityChatMessage.last
      expect(last_read.user).to eq(buyer)
      expect(last_read.community).to eq(community)
      expect(last_read.community_chat_message).to eq(message)
    end
  end
end
