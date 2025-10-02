# frozen_string_literal: true

module Admin::FetchAffiliateUser
  private

  def fetch_affiliate_user
    @user = User.where(username: affiliate_param)
                .or(User.where(id: affiliate_param))
                .or(User.where(external_id: affiliate_param.gsub(/^ext-/, "")))
                .first

    e404 if @user.nil? || @user.direct_affiliate_accounts.empty?
  end

  private

    def affiliate_param
      params[:id]
    end
end
