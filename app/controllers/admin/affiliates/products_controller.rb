# frozen_string_literal: true

class Admin::Affiliates::ProductsController < Admin::Affiliates::BaseController
  include Admin::Users::ListPaginatedProducts

  before_action :fetch_affiliate_user

  private

    def page_title
      "#{user.display_name} on Gumroad"
    end

    def inertia_template
      "Admin/Affiliates/Products/Index"
    end
end
