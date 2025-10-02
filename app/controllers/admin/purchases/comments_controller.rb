# frozen_string_literal: true

class Admin::Purchases::CommentsController < Admin::Purchases::BaseController
  include Admin::Commentable

  before_action :fetch_purchase

  private

    def commentable
      @purchase
    end
end
