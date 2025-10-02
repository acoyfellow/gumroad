# frozen_string_literal: true

module Admin::ListPaginatedUsers
  extend ActiveSupport::Concern

  include Pagy::Backend

  RECORDS_PER_PAGE = 25

  included do
    layout 'admin_inertia'
  end

  def index
    @title = page_title

    pagination, users = pagy_countless(
      users_scope,
      page: params[:page],
      limit: params[:per_page] || RECORDS_PER_PAGE,
      countless_minimal: true
    )

    yield [pagination, users] if block_given?

    if request.format.json?
      render json: { pagination:, users: }
    else
      render inertia: inertia_template,
             props: inertia_props(
               users: InertiaRails.merge {
                 users.map do |user|
                   user.as_json(admin: true, impersonatable: policy([:admin, :impersonators, user]).create?)
                end
               },
               pagination:
             )
    end
  end

  private

    def page_title
      raise NotImplementedError, 'must be overriden in subclass'
    end

    def users_scope
      raise NotImplementedError, 'must be overriden in subclass'
    end

    def inertia_template
      raise NotImplementedError, 'must be overriden in subclass'
    end
end
