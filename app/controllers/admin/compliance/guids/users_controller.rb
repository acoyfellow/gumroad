# frozen_string_literal: true

class Admin::Compliance::Guids::Usersontroller < Admin::Compliance::Guids::BaseController
  include Admin::ListPaginatedUsers

  private

    def page_title
      guid
    end

    def users_scope
      User.where(id: Event.by_browser_guid(guid).select(:user_id))
    end

    def inertia_template
      "Admin/Compliance/Guids/Users/Index"
    end
  end
end

