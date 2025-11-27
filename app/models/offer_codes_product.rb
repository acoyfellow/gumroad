# frozen_string_literal: true

class OfferCodesProduct < ApplicationRecord
  belongs_to :offer_code
  belongs_to :product, class_name: "Link"
end
