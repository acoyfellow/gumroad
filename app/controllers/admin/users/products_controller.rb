# frozen_string_literal: true

class Admin::Users::ProductsController < Admin::Users::BaseController
  include Admin::Users::ListPaginatedProducts

  before_action :fetch_user

  private

    def inertia_template
      "Admin/Users/Products/Index"
    end
end
