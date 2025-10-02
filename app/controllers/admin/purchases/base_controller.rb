# frozen_string_literal: true

class Admin::Purchases::BaseController < Admin::BaseController
  include Admin::FetchPurchase

  before_action :fetch_purchase
end
