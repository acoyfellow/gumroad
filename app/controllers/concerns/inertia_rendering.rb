# frozen_string_literal: true

module InertiaRendering
  extend ActiveSupport::Concern
  include ApplicationHelper

  included do
    inertia_share do
      RenderingExtension.custom_context(view_context).merge(
        authenticity_token: form_authenticity_token,
        flash: inertia_flash_props,
        title: page_title
      )
    end

    inertia_share if: :user_signed_in? do
      { current_user: current_user_props(current_user, impersonated_user) }
    end
  end

  private
    def inertia_flash_props
      if flash[:inertia].present?
        inertia_flash = flash[:inertia].to_h.with_indifferent_access
        if inertia_flash[:status].present? && inertia_flash[:status].start_with?("frontend_alert")
          return { status: inertia_flash[:status], data: inertia_flash[:data] || {} }
        end
      end

      return if (flash_message = flash[:alert] || flash[:warning] || flash[:notice]).blank?

      { message: flash_message, status: flash[:alert] ? "danger" : flash[:warning] ? "warning" : "success", html: flash_message.to_s.start_with?("<") && flash_message.to_s.end_with?(">") }
    end

    def inertia_errors(model, model_name: nil)
      prefix = model_name.presence || model.model_name.element
      { errors: model.errors.to_hash.each_with_object({}) do |(key, messages), hash|
        hash["#{prefix}.#{key}"] = messages.to_sentence
      end }
    end
end
