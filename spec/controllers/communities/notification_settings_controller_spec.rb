# frozen_string_literal: true

require "spec_helper"

describe Communities::NotificationSettingsController do
  let(:seller) { create(:user) }
  let(:product) { create(:product, user: seller, community_chat_enabled: true) }
  let!(:community) { create(:community, resource: product, seller: seller) }

  before do
    Feature.activate_user(:communities, seller)
  end

  describe "PUT #update" do
    context "when logged in as a user with access" do
      let(:buyer) { create(:user) }
      let!(:purchase) { create(:purchase, seller: seller, purchaser: buyer, link: product) }

      before do
        sign_in(buyer)
      end

      it "creates notification settings" do
        expect do
          put :update, params: {
            community_id: community.external_id,
            settings: { recap_frequency: "weekly" }
          }
        end.to change(CommunityNotificationSetting, :count).by(1)

        expect(response).to have_http_status(:ok)

        settings = buyer.community_notification_settings.find_by(seller: seller)
        expect(settings.recap_frequency).to eq("weekly")

        json = JSON.parse(response.body)
        expect(json["settings"]["recap_frequency"]).to eq("weekly")
      end

      it "updates existing notification settings" do
        existing_settings = create(:community_notification_setting, user: buyer, seller: seller, recap_frequency: "daily")

        put :update, params: {
          community_id: community.external_id,
          settings: { recap_frequency: "weekly" }
        }

        expect(response).to have_http_status(:ok)
        expect(existing_settings.reload.recap_frequency).to eq("weekly")
      end

      it "allows setting recap_frequency to nil" do
        existing_settings = create(:community_notification_setting, user: buyer, seller: seller, recap_frequency: "weekly")

        put :update, params: {
          community_id: community.external_id,
          settings: { recap_frequency: nil }
        }

        expect(response).to have_http_status(:ok)
        expect(existing_settings.reload.recap_frequency).to be_nil
      end
    end

    context "when logged in as a user without access" do
      let(:other_user) { create(:user) }

      before do
        sign_in(other_user)
      end

      it "returns not found" do
        put :update, params: {
          community_id: community.external_id,
          settings: { recap_frequency: "weekly" }
        }

        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
