# frozen_string_literal: true

# Run: rails runner script/debug_cancellation_discount_validation.rb qn
# Or in console: load "script/debug_cancellation_discount_validation.rb"; debug_cancellation_discount(Link.find_by!(unique_permalink: "qn"), 200_000)

def debug_cancellation_discount(product, discount_cents)
  puts "Product: #{product.name} (##{product.id}, #{product.unique_permalink})"
  puts "  native_type: #{product.native_type}, is_tiered_membership: #{product.is_tiered_membership?}"
  puts "  price_currency_type: #{product.price_currency_type}"
  puts "  currency min_price (cents): #{product.currency['min_price']}"
  puts ""

  if product.is_tiered_membership?
    puts "Tiers:"
    product.tiers.each do |tier|
      prices = VariantPrice.where(variant_id: tier.id).alive.is_buy
      price_cents_list = prices.pluck(:price_cents)
      puts "  #{tier.name} (variant_id=#{tier.id}): #{price_cents_list.blank? ? 'no VariantPrice records' : price_cents_list.join(', ')} cents"
    end
  end

  available = product.available_price_cents
  puts ""
  puts "product.available_price_cents: #{available.inspect} (size: #{available.size})"

  if available.empty?
    puts ""
    puts ">>> Validation passes because available_price_cents is empty."
    puts "    In Ruby, [].all? { ... } returns true, so is_amount_valid?(product) is true."
    puts "    Add VariantPrice records to tiers (recurring prices) for the check to run."
    return
  end

  puts ""
  puts "With fixed discount #{discount_cents} cents:"
  min_price = product.currency["min_price"]
  all_valid = true
  available.each do |price_cents|
    price_after = price_cents - discount_cents
    valid = price_after <= 0 || price_after >= min_price
    all_valid = false unless valid
    puts "  #{price_cents} - #{discount_cents} = #{price_after} -> #{valid ? 'OK' : 'FAIL'} (must be <= 0 or >= #{min_price})"
  end
  puts ""
  puts all_valid ? ">>> Validation would pass (all prices OK)." : ">>> Validation would fail (at least one price in (0, #{min_price}))."
end

permalink = ARGV[0] || "qn"
discount_cents = (ARGV[1] || "200000").to_i
product = Link.find_by(unique_permalink: permalink)
if product.nil?
  puts "Product with unique_permalink=#{permalink} not found."
  exit 1
end
debug_cancellation_discount(product, discount_cents)
