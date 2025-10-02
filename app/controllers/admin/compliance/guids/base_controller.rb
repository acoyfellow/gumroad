# frozen_string_literal: true

class Admin::Compliance::Guids::BaseController < Admin::BaseController

  protected

    def guid
      params[:id]
    end
end
