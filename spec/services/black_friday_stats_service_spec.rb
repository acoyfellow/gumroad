# frozen_string_literal: true

require "spec_helper"

describe BlackFridayStatsService do
  describe ".calculate_stats" do
    let!(:seller1) { create(:user) }
    let!(:seller2) { create(:user) }
    let!(:product1) { create(:product, user: seller1, price_cents: 1000) }
    let!(:product2) { create(:product, user: seller2, price_cents: 2000) }

    let!(:offer_code1) do
      create(:offer_code, user: seller1, code: "BLACKFRIDAY2025", amount_percentage: 25, products: [product1])
    end

    let!(:offer_code2) do
      create(:offer_code, user: seller2, code: "BLACKFRIDAY2025", amount_percentage: 30, products: [product2])
    end

    let!(:other_offer_code) do
      create(:offer_code, user: seller1, code: "SUMMER2025", amount_percentage: 15, products: [product1])
    end

    before do
      create_list(:purchase, 5, link: product1, offer_code: offer_code1, price_cents: 750)
      create_list(:purchase, 3, link: product2, offer_code: offer_code2, price_cents: 1400)
      create_list(:purchase, 2, link: product1, offer_code: other_offer_code, price_cents: 850)
    end

    it "calculates the correct statistics for Black Friday offer codes" do
      stats = described_class.calculate_stats

      expect(stats[:active_deals_count]).to eq(2)
      expect(stats[:revenue_cents]).to eq((5 * 750) + (3 * 1400))
      expect(stats[:average_discount_percentage]).to eq(28)
    end

    it "excludes deleted offer codes" do
      offer_code1.mark_deleted
      stats = described_class.calculate_stats

      expect(stats[:active_deals_count]).to eq(1)
      expect(stats[:revenue_cents]).to eq(3 * 1400)
      expect(stats[:average_discount_percentage]).to eq(30)
    end

    it "handles no Black Friday codes" do
      OfferCode.where(code: "BLACKFRIDAY2025").each(&:mark_deleted)
      stats = described_class.calculate_stats

      expect(stats[:active_deals_count]).to eq(0)
      expect(stats[:revenue_cents]).to eq(0)
      expect(stats[:average_discount_percentage]).to eq(0)
    end
  end

  describe ".fetch_stats" do
    let!(:seller) { create(:user) }
    let!(:product) { create(:product, user: seller, price_cents: 1000) }
    let!(:offer_code) do
      create(:offer_code, user: seller, code: "BLACKFRIDAY2025", amount_percentage: 25, products: [product])
    end

    before do
      create_list(:purchase, 3, link: product, offer_code:, price_cents: 750)
      Rails.cache.clear
    end

    after do
      Rails.cache.clear
    end

    it "caches the stats and doesn't recalculate on subsequent calls" do
      expect(described_class).to receive(:calculate_stats).once.and_call_original

      first_result = described_class.fetch_stats
      second_result = described_class.fetch_stats

      expect(first_result).to eq(second_result)
      expect(first_result[:active_deals_count]).to eq(1)
      expect(first_result[:revenue_cents]).to eq(2250)
    end

    it "uses the correct cache key and expiration" do
      expect(Rails.cache).to receive(:fetch).with(
        "black_friday_stats",
        expires_in: 10.minutes
      ).and_call_original

      described_class.fetch_stats
    end

    it "returns cached data even when underlying data changes" do
      first_result = described_class.fetch_stats
      expect(first_result[:active_deals_count]).to eq(1)
      expect(first_result[:revenue_cents]).to eq(2250)

      # Add more data after caching
      new_product = create(:product, user: seller, price_cents: 2000)
      new_offer_code = create(:offer_code, user: seller, code: "BLACKFRIDAY2025", amount_percentage: 30, products: [new_product])
      create_list(:purchase, 5, link: new_product, offer_code: new_offer_code, price_cents: 1400)

      # Should still return cached data
      cached_result = described_class.fetch_stats
      expect(cached_result[:active_deals_count]).to eq(1) # Still shows old count
      expect(cached_result[:revenue_cents]).to eq(2250) # Still shows old revenue
    end

    it "recalculates stats after cache expires" do
      # Freeze time to control cache expiration
      travel_to Time.current do
        first_result = described_class.fetch_stats
        expect(first_result[:active_deals_count]).to eq(1)
        expect(first_result[:revenue_cents]).to eq(2250)

        # Add more data
        new_product = create(:product, user: seller, price_cents: 2000)
        new_offer_code = create(:offer_code, user: seller, code: "BLACKFRIDAY2025", amount_percentage: 30, products: [new_product])
        create_list(:purchase, 5, link: new_product, offer_code: new_offer_code, price_cents: 1400)

        # Travel past cache expiration
        travel 11.minutes

        # Should recalculate with new data
        new_result = described_class.fetch_stats
        expect(new_result[:active_deals_count]).to eq(2)
        expect(new_result[:revenue_cents]).to eq(9250) # 2250 + 7000
        expect(new_result[:average_discount_percentage]).to eq(28) # (25 + 30) / 2
      end
    end

    it "stores stats in Rails cache" do
      described_class.fetch_stats

      cached_value = Rails.cache.read("black_friday_stats")
      expect(cached_value).to be_present
      expect(cached_value[:active_deals_count]).to eq(1)
      expect(cached_value[:revenue_cents]).to eq(2250)
      expect(cached_value[:average_discount_percentage]).to eq(25)
    end

    it "handles cache deletion and recalculates" do
      first_result = described_class.fetch_stats
      expect(first_result[:active_deals_count]).to eq(1)

      # Manually delete cache
      Rails.cache.delete("black_friday_stats")

      # Add more data
      new_product = create(:product, user: seller, price_cents: 2000)
      new_offer_code = create(:offer_code, user: seller, code: "BLACKFRIDAY2025", amount_percentage: 30, products: [new_product])
      create_list(:purchase, 2, link: new_product, offer_code: new_offer_code, price_cents: 1400)

      # Should recalculate immediately after cache deletion
      new_result = described_class.fetch_stats
      expect(new_result[:active_deals_count]).to eq(2)
      expect(new_result[:revenue_cents]).to eq(5050) # 2250 + 2800
    end
  end
end
