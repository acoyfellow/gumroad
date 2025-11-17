# frozen_string_literal: true

class Settings::PasswordController < Settings::BaseController
  before_action :set_user
  before_action :authorize

  def show
    @title = "Settings"

    render inertia: "Settings/Password", props: settings_presenter.password_props
  end

  def update
    added_password = false
    payload = params[:user] || {}

    if @user.provider.present?
      unless @user.confirmed?
        message = "You have to confirm your email address before you can do that."
        return redirect_to(
          settings_password_path,
          inertia: { errors: { error: message } },
          alert: message,
          status: :see_other
        )
      end

      @user.password = payload[:new_password]
      @user.provider = nil
      added_password = true
    else
      unless payload[:password].present? && @user.valid_password?(payload[:password])
        message = "Incorrect password."
        return redirect_to(
          settings_password_path,
          inertia: { errors: { error: message } },
          alert: message,
          status: :see_other
        )
      end
      @user.password = payload[:new_password]
    end

    if @user.save
      invalidate_active_sessions_except_the_current_session!
      bypass_sign_in(@user)
      render inertia: "Settings/Password",
            props: settings_presenter.password_props.merge(new_password: added_password),
            status: :ok
    else
      message = "New password #{@user.errors[:password].to_sentence}"
      redirect_to(
        settings_password_path,
        inertia: { errors: { error: message } },
        alert: message,
        status: :see_other
      )
    end
  end

  private
    def set_user
      @user = current_seller
    end

    def authorize
      super([:settings, :password, @user])
    end
end
