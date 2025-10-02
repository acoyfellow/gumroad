# frozen_string_literal: true

class Admin::Search::Purchases::BaseController < Admin::Search::BaseController
  include Admin::FetchPurchase
end
