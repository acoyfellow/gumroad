# frozen_string_literal: true

class Tip < ApplicationRecord
  belongs_to :purchase
  validates :value_cents, numericality: { greater_than: 0 }

  def formatted_value_usd_cents
    Money.new(value_usd_cents).format(symbol: true)
  end
end
