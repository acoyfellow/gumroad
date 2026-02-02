# frozen_string_literal: true

class Communities::ChatMessagesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_community
  before_action :set_message, only: [:update, :destroy]
  after_action :verify_authorized

  def create
    authorize @community, :show?

    message = @community.community_chat_messages.build(permitted_params)
    message.user = current_user

    if message.save
      broadcast_message(message, CommunityChannel::CREATE_CHAT_MESSAGE_TYPE)
      redirect_to community_redirect_path, status: :see_other
    else
      redirect_to community_redirect_path, alert: message.errors.full_messages.first
    end
  end

  def update
    if @message.update(permitted_params)
      broadcast_message(@message, CommunityChannel::UPDATE_CHAT_MESSAGE_TYPE)
      redirect_to community_redirect_path, status: :see_other
    else
      redirect_to community_redirect_path, alert: @message.errors.full_messages.first
    end
  end

  def destroy
    @message.mark_deleted!
    broadcast_message(@message, CommunityChannel::DELETE_CHAT_MESSAGE_TYPE)
    redirect_to community_redirect_path, status: :see_other
  end

  def mark_read
    authorize @community, :show?

    message = @community.community_chat_messages.find_by_external_id(params[:message_id])
    return e404 unless message

    mark_read_params = { user_id: current_user.id, community_id: @community.id, community_chat_message_id: message.id }
    LastReadCommunityChatMessage.set!(**mark_read_params)

    redirect_to community_path(seller_id: @community.seller.external_id, community_id: @community.external_id)
  end

  private
    def set_community
      @community = Community.find_by_external_id(params[:community_id])
      e404 unless @community
    end

    def set_message
      @message = @community.community_chat_messages.find_by_external_id(params[:id])
      return e404 unless @message
      authorize @message
    end

    def permitted_params
      params.require(:community_chat_message).permit(:content)
    end

    def broadcast_message(message, type)
      message_props = CommunityChatMessagePresenter.new(message: message).props
      CommunityChannel.broadcast_to(
        "community_#{@community.external_id}",
        { type: type, message: message_props }
      )
    rescue => e
      Rails.logger.error("Error broadcasting message to community channel: #{e.message}")
      Bugsnag.notify(e)
    end

    def community_redirect_path
      community_path(@community.seller.external_id, @community.external_id)
    end
end
