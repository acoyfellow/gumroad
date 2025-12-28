# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "inertia_rails/rspec"

describe AudienceController, inertia: true do
  let(:seller) { create(:named_seller) }

  include_context "with user signed in as admin for seller"

  describe "GET index" do
    it_behaves_like "authorize called for action", :get, :index do
      let(:record) { :audience }
    end

    it "renders Inertia component with zero followers" do
      get :index

      expect(response).to be_successful
      expect(inertia.component).to eq("Audience/Index")
      expect(inertia.props[:total_follower_count]).to eq(0)
    end

    it "renders Inertia component with correct follower count" do
      create(:active_follower, user: seller)

      get :index

      expect(response).to be_successful
      expect(inertia.component).to eq("Audience/Index")
      expect(inertia.props[:total_follower_count]).to eq(1)
    end

    it "renders Inertia component with audience_data when followers exist" do
      create(:active_follower, user: seller).confirm!

      get :index

      expect(response).to be_successful
      expect(inertia.props[:audience_data]).to be_present
      expect(inertia.props[:audience_data]).to have_key(:by_date)
      expect(inertia.props[:audience_data]).to have_key(:dates)
    end

    it "renders Inertia component with nil audience_data when no followers" do
      get :index

      expect(response).to be_successful
      expect(inertia.props[:audience_data]).to be_nil
    end

    it "sets the last viewed dashboard cookie" do
      get :index

      expect(response.cookies["last_viewed_dashboard"]).to eq("audience")
    end

    context "with date range parameters" do
      before do
        seller.update!(timezone: "UTC")

        travel_to Time.utc(2021, 1, 3) do
          create(:active_follower, user: seller).confirm!
          follower = create(:active_follower, user: seller)
          follower.confirm!
          follower.mark_deleted!
        end
      end

      it "returns audience_data with expected data for date range", :sidekiq_inline, :elasticsearch_wait_for_refresh do
        expect_any_instance_of(CreatorAnalytics::Following).to receive(:by_date)
          .with(start_date: Date.new(2021, 1, 1), end_date: Date.new(2021, 1, 3))
          .and_call_original

        get :index, params: { from: Time.utc(2021, 1, 1), to: Time.utc(2021, 1, 3) }

        expect(response).to be_successful
        expect(inertia.component).to eq("Audience/Index")
        expect(inertia.props[:audience_data]).to eq(
          dates: ["Friday, January 1st", "Saturday, January 2nd", "Sunday, January 3rd"],
          start_date: "Jan  1, 2021",
          end_date: "Jan  3, 2021",
          by_date: {
            new_followers: [0, 0, 2],
            followers_removed: [0, 0, 1],
            totals: [0, 0, 1]
          },
          first_follower_date: "Jan  3, 2021",
          new_followers: 1
        )
      end

      it "handles various timezone formats in date parameters" do
        mask = "%a %b %d %Y %H:%M:%S GMT-1200 (Changement de date)"
        get :index, params: { from: 2.days.ago.strftime(mask), to: 1.day.ago.strftime(mask) }

        expect(response).to be_successful
        expect(inertia.props[:audience_data]).to be_present
      end
    end
  end

  describe "POST export" do
    it_behaves_like "authorize called for action", :post, :export do
      let(:record) { :audience }
    end

    let!(:follower) { create(:active_follower, user: seller) }
    let(:options) { { "followers" => true, "customers" => false, "affiliates" => false } }

    it "enqueues a job for sending the CSV" do
      post :export, params: { options: options }, as: :json
      expect(Exports::AudienceExportWorker).to have_enqueued_sidekiq_job(seller.id, seller.id, options)

      expect(response).to have_http_status(:ok)
    end

    context "when admin is signed in and impersonates seller" do
      let(:admin_user) { create(:admin_user) }

      before do
        sign_in admin_user
        controller.impersonate_user(seller)
      end

      it "queues sidekiq job for the admin" do
        post :export, params: { options: options }, as: :json
        expect(Exports::AudienceExportWorker).to have_enqueued_sidekiq_job(seller.id, admin_user.id, options)

        expect(response).to have_http_status(:ok)
      end
    end
  end
end
