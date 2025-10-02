# frozen_string_literal: true

class Admin::Compliance::GuidsController < Admin::BaseController
  include Admin::FetchUser

  before_action :fetch_user, only: [:index]

  def index
    guids = Event.where(user_id: @user.id).distinct.pluck(:browser_guid)
    guids_to_users = Event.select(:user_id, :browser_guid).by_browser_guid(guids).
                           where.not(user_id: nil).distinct.group_by(&:browser_guid).
                           map { |browser_guid, events| { guid: browser_guid, user_ids: events.map(&:user_id) } }
    render json: guids_to_users
  end

  private

    def user_param
      params[:user_id]
    end
end
