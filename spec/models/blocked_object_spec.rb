# frozen_string_literal: true

require "spec_helper"

describe BlockedObject do
  after do
    BlockedObject.delete_all
  end

  describe "validations" do
    it "validates inclusion of object_type in BLOCKED_OBJECT_TYPES" do
      blocked_object = BlockedObject.new(
        object_type: "invalid_type",
        object_value: "test_value",
        blocked_at: Time.current,
        blocked_by: 1
      )
      expect(blocked_object).not_to be_valid
      expect(blocked_object.errors[:object_type]).to include("is not included in the list")
    end

    it "validates presence of expires_at for ip_address when blocked_at is present" do
      blocked_object = BlockedObject.new(
        object_type: BLOCKED_OBJECT_TYPES[:ip_address],
        object_value: "192.168.1.1",
        blocked_at: Time.current,
        expires_at: nil,
        blocked_by: 1
      )
      expect(blocked_object).not_to be_valid
      expect(blocked_object.errors[:expires_at]).to include("can't be blank")
    end

    it "allows ip_address without expires_at when blocked_at is nil" do
      blocked_object = BlockedObject.new(
        object_type: BLOCKED_OBJECT_TYPES[:ip_address],
        object_value: "192.168.1.1",
        blocked_at: nil,
        expires_at: nil,
        blocked_by: 1
      )
      expect(blocked_object).to be_valid
    end

    it "allows non-ip_address objects without expires_at" do
      blocked_object = BlockedObject.new(
        object_type: BLOCKED_OBJECT_TYPES[:email],
        object_value: "test@example.com",
        blocked_at: Time.current,
        expires_at: nil,
        blocked_by: 1
      )
      expect(blocked_object).to be_valid
    end
  end

  describe "dynamic scopes and methods" do
    let!(:email_blocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "test@example.com", blocked_at: Time.current, blocked_by: 1) }
    let!(:ip_blocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:ip_address], object_value: "192.168.1.1", blocked_at: Time.current, expires_at: 1.hour.from_now, blocked_by: 1) }
    let!(:browser_blocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:browser_guid], object_value: "browser123", blocked_at: Time.current, blocked_by: 1) }
    let!(:email_domain_blocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email_domain], object_value: "example.com", blocked_at: Time.current, blocked_by: 1) }
    let!(:fingerprint_blocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:charge_processor_fingerprint], object_value: "fingerprint123", blocked_at: Time.current, blocked_by: 1) }
    let!(:product_blocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:product], object_value: "product456", blocked_at: Time.current, blocked_by: 1) }

    describe ".email scope" do
      it "returns only email objects" do
        results = BlockedObject.email
        expect(results.count).to eq(1)
        expect(results.first).to eq(email_blocked)
        results.each do |result|
          expect(result.object_type).to eq(BLOCKED_OBJECT_TYPES[:email])
        end
      end
    end

    describe ".ip_address scope" do
      it "returns only ip_address objects" do
        results = BlockedObject.ip_address
        expect(results.count).to eq(1)
        expect(results.first).to eq(ip_blocked)
        results.each do |result|
          expect(result.object_type).to eq(BLOCKED_OBJECT_TYPES[:ip_address])
        end
      end
    end

    describe ".browser_guid scope" do
      it "returns only browser_guid objects" do
        results = BlockedObject.browser_guid
        expect(results.count).to eq(1)
        expect(results.first).to eq(browser_blocked)
        results.each do |result|
          expect(result.object_type).to eq(BLOCKED_OBJECT_TYPES[:browser_guid])
        end
      end
    end

    describe ".email_domain scope" do
      it "returns only email_domain objects" do
        results = BlockedObject.email_domain
        expect(results.count).to eq(1)
        expect(results.first).to eq(email_domain_blocked)
        results.each do |result|
          expect(result.object_type).to eq(BLOCKED_OBJECT_TYPES[:email_domain])
        end
      end
    end

    describe ".charge_processor_fingerprint scope" do
      it "returns only charge_processor_fingerprint objects" do
        results = BlockedObject.charge_processor_fingerprint
        expect(results.count).to eq(1)
        expect(results.first).to eq(fingerprint_blocked)
        results.each do |result|
          expect(result.object_type).to eq(BLOCKED_OBJECT_TYPES[:charge_processor_fingerprint])
        end
      end
    end

    describe ".product scope" do
      it "returns only product objects" do
        results = BlockedObject.product
        expect(results.count).to eq(1)
        expect(results.first).to eq(product_blocked)
        results.each do |result|
          expect(result.object_type).to eq(BLOCKED_OBJECT_TYPES[:product])
        end
      end
    end

    describe "#email?" do
      it "returns true for email objects" do
        expect(email_blocked.email?).to be true
      end

      it "returns false for non-email objects" do
        expect(ip_blocked.email?).to be false
        expect(browser_blocked.email?).to be false
        expect(email_domain_blocked.email?).to be false
        expect(fingerprint_blocked.email?).to be false
        expect(product_blocked.email?).to be false
      end
    end

    describe "#ip_address?" do
      it "returns true for ip_address objects" do
        expect(ip_blocked.ip_address?).to be true
      end

      it "returns false for non-ip_address objects" do
        expect(email_blocked.ip_address?).to be false
        expect(browser_blocked.ip_address?).to be false
        expect(email_domain_blocked.ip_address?).to be false
        expect(fingerprint_blocked.ip_address?).to be false
        expect(product_blocked.ip_address?).to be false
      end
    end

    describe "#browser_guid?" do
      it "returns true for browser_guid objects" do
        expect(browser_blocked.browser_guid?).to be true
      end

      it "returns false for non-browser_guid objects" do
        expect(email_blocked.browser_guid?).to be false
        expect(ip_blocked.browser_guid?).to be false
        expect(email_domain_blocked.browser_guid?).to be false
        expect(fingerprint_blocked.browser_guid?).to be false
        expect(product_blocked.browser_guid?).to be false
      end
    end

    describe "#email_domain?" do
      it "returns true for email_domain objects" do
        expect(email_domain_blocked.email_domain?).to be true
      end

      it "returns false for non-email_domain objects" do
        expect(email_blocked.email_domain?).to be false
        expect(ip_blocked.email_domain?).to be false
        expect(browser_blocked.email_domain?).to be false
        expect(fingerprint_blocked.email_domain?).to be false
        expect(product_blocked.email_domain?).to be false
      end
    end

    describe "#charge_processor_fingerprint?" do
      it "returns true for charge_processor_fingerprint objects" do
        expect(fingerprint_blocked.charge_processor_fingerprint?).to be true
      end

      it "returns false for non-charge_processor_fingerprint objects" do
        expect(email_blocked.charge_processor_fingerprint?).to be false
        expect(ip_blocked.charge_processor_fingerprint?).to be false
        expect(browser_blocked.charge_processor_fingerprint?).to be false
        expect(email_domain_blocked.charge_processor_fingerprint?).to be false
        expect(product_blocked.charge_processor_fingerprint?).to be false
      end
    end

    describe "#product?" do
      it "returns true for product objects" do
        expect(product_blocked.product?).to be true
      end

      it "returns false for non-product objects" do
        expect(email_blocked.product?).to be false
        expect(ip_blocked.product?).to be false
        expect(browser_blocked.product?).to be false
        expect(email_domain_blocked.product?).to be false
        expect(fingerprint_blocked.product?).to be false
      end
    end
  end

  describe ".active scope" do
    let!(:active_permanent) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "active@example.com", blocked_at: 1.hour.ago, expires_at: nil, blocked_by: 1) }
    let!(:active_future_expiry) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:ip_address], object_value: "192.168.1.2", blocked_at: 1.hour.ago, expires_at: 1.hour.from_now, blocked_by: 1) }
    let!(:expired) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:browser_guid], object_value: "expired123", blocked_at: 2.hours.ago, expires_at: 1.hour.ago, blocked_by: 1) }
    let!(:unblocked) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "unblocked@example.com", blocked_at: nil, expires_at: nil, blocked_by: 1) }

    it "includes permanently blocked objects" do
      expect(BlockedObject.active).to include(active_permanent)
    end

    it "includes objects with future expiry dates" do
      expect(BlockedObject.active).to include(active_future_expiry)
    end

    it "excludes expired objects" do
      expect(BlockedObject.active).not_to include(expired)
    end

    it "excludes unblocked objects (blocked_at is nil)" do
      expect(BlockedObject.active).not_to include(unblocked)
    end

    it "returns correct count" do
      expect(BlockedObject.active.count).to eq(2)
    end
  end

  describe ".find_active_object" do
    let!(:active_object) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "findme@example.com", blocked_at: Time.current, blocked_by: 1) }
    let!(:expired_object) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "expired@example.com", blocked_at: 2.hours.ago, expires_at: 1.hour.ago, blocked_by: 1) }

    it "finds active objects" do
      result = BlockedObject.find_active_object("findme@example.com")
      expect(result).to eq(active_object)
    end

    it "does not find expired objects" do
      result = BlockedObject.find_active_object("expired@example.com")
      expect(result).to be_nil
    end

    it "returns nil for non-existent objects" do
      result = BlockedObject.find_active_object("nonexistent@example.com")
      expect(result).to be_nil
    end

    it "handles NoMethodError gracefully" do
      allow(BlockedObject).to receive(:active).and_raise(NoMethodError)
      result = BlockedObject.find_active_object("test@example.com")
      expect(result).to eq(BlockedObject.none)
    end
  end

  describe ".find_active_objects" do
    let!(:active1) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "active1@example.com", blocked_at: Time.current, blocked_by: 1) }
    let!(:active2) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "active2@example.com", blocked_at: Time.current, blocked_by: 1) }
    let!(:expired) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "expired@example.com", blocked_at: 2.hours.ago, expires_at: 1.hour.ago, blocked_by: 1) }

    it "finds multiple active objects" do
      values = ["active1@example.com", "active2@example.com", "expired@example.com", "nonexistent@example.com"]
      results = BlockedObject.find_active_objects(values)
      expect(results).to include(active1, active2)
      expect(results).not_to include(expired)
      expect(results.count).to eq(2)
    end

    it "returns empty collection for non-existent values" do
      results = BlockedObject.find_active_objects(["nonexistent1@example.com", "nonexistent2@example.com"])
      expect(results).to be_empty
    end

    it "handles NoMethodError gracefully" do
      allow(BlockedObject).to receive(:active).and_raise(NoMethodError)
      result = BlockedObject.find_active_objects(["test@example.com"])
      expect(result).to eq(BlockedObject.none)
    end
  end

  describe "#blocked?" do
    it "returns true when blocked_at is present and not expired" do
      blocked_object = BlockedObject.new(blocked_at: Time.current, expires_at: 1.hour.from_now)
      expect(blocked_object.blocked?).to be true
    end

    it "returns true when blocked_at is present and expires_at is nil" do
      blocked_object = BlockedObject.new(blocked_at: Time.current, expires_at: nil)
      expect(blocked_object.blocked?).to be true
    end

    it "returns false when blocked_at is nil" do
      blocked_object = BlockedObject.new(blocked_at: nil, expires_at: 1.hour.from_now)
      expect(blocked_object.blocked?).to be false
    end

    it "returns false when blocked_at is present but expired" do
      blocked_object = BlockedObject.new(blocked_at: 2.hours.ago, expires_at: 1.hour.ago)
      expect(blocked_object.blocked?).to be false
    end

    it "handles edge case where expires_at equals current time" do
      now = Time.current
      allow(Time).to receive(:current).and_return(now)
      blocked_object = BlockedObject.new(blocked_at: 1.hour.ago, expires_at: now)
      expect(blocked_object.blocked?).to be false
    end
  end

  describe "#block!" do
    let(:blocked_object) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "instance@example.com", blocked_by: 1) }

    it "calls the class method with correct parameters" do
      expect(BlockedObject).to receive(:block!).with(
        BLOCKED_OBJECT_TYPES[:email],
        "instance@example.com",
        123,
        expires_in: 2.hours
      )
      blocked_object.block!(by_user_id: 123, expires_in: 2.hours)
    end

    it "works without optional parameters" do
      expect(BlockedObject).to receive(:block!).with(
        BLOCKED_OBJECT_TYPES[:email],
        "instance@example.com",
        nil,
        expires_in: nil
      )
      blocked_object.block!
    end
  end

  describe ".block!" do
    describe "when blocked object doesn't exist" do
      it "creates a new blocked object record" do
        count = BlockedObject.count
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], "123.456.789.0", nil, expires_in: 1.hour)
        expect(BlockedObject.all.count).to eq count + 1
        expect(BlockedObject.find_by(object_value: "123.456.789.0").blocked?).to be(true)
      end
    end

    describe "when blocked object exists" do
      it "updates the existing record" do
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], "789.123.456.0", nil, expires_in: 1.hour)
        BlockedObject.unblock!("789.123.456.0")
        count = BlockedObject.count
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], "789.123.456.0", nil, expires_in: 1.hour)
        expect(BlockedObject.count).to eq count
      end
    end

    context "when :expires_in is present" do
      it "blocks and sets the expiration date appropriately" do
        count = BlockedObject.active.count
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], "789.124.456.0", nil, expires_in: 3.days)
        expect(BlockedObject.active.count).to eq count + 1
        expect(BlockedObject.last.expires_at).to_not be(nil)
      end

      it "is not active after the expiration date" do
        count = BlockedObject.active.count
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], "789.125.456.0", nil, expires_in: -3.days)
        expect(BlockedObject.active.count).to eq count
      end
    end
  end

  describe "#unblock!" do
    let(:blocked_object) do
      ip_address = "157.45.09.212"
      BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], ip_address, nil, expires_in: 1.hour)

      BlockedObject.find_by(object_value: ip_address)
    end

    it "unblocks the blocked object" do
      expect(blocked_object.blocked?).to be(true)

      blocked_object.unblock!

      expect(blocked_object.blocked?).to be(false)
    end
  end

  describe ".unblock!" do
    describe "when it isn't there" do
      it "fails silently" do
        expect(BlockedObject.find_by(object_value: "lol")).to be(nil)
        expect(-> { BlockedObject.unblock!("lol") }).to_not raise_error
      end
    end

    describe "when it is there" do
      it "unblocks" do
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], "456.789.123.0", nil, expires_in: 1.hour)
        expect(BlockedObject.find_by(object_value: "456.789.123.0").blocked?).to be(true)
        BlockedObject.unblock!("456.789.123.0")
        expect(BlockedObject.find_by(object_value: "456.789.123.0").blocked?).to be(false)
      end
    end
  end

  describe ".charge_processor_fingerprint" do
    let(:email) { "paypal@example.com" }

    before do
      BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, nil)
      BlockedObject.block!(BLOCKED_OBJECT_TYPES[:charge_processor_fingerprint], email, nil)
    end

    it "returns the list of blocked objects with object_type 'charge_processor_fingerprint'" do
      expect(BlockedObject.charge_processor_fingerprint.count).to eq 1

      blocked_object = BlockedObject.charge_processor_fingerprint.first
      expect(blocked_object.object_type).to eq BLOCKED_OBJECT_TYPES[:charge_processor_fingerprint]
      expect(blocked_object.object_value).to eq email
    end
  end

  describe "different object types behavior" do
    describe "email blocking" do
      it "blocks and unblocks emails properly" do
        email = "test@example.com"
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, 1)

        blocked_object = BlockedObject.find_by(object_value: email)
        expect(blocked_object.email?).to be true
        expect(blocked_object.blocked?).to be true
        expect(blocked_object.expires_at).to be_nil
      end
    end

    describe "email_domain blocking" do
      it "blocks and unblocks email domains properly" do
        domain = "suspicious-domain.com"
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email_domain], domain, 1)

        blocked_object = BlockedObject.find_by(object_value: domain)
        expect(blocked_object.email_domain?).to be true
        expect(blocked_object.blocked?).to be true
        expect(blocked_object.expires_at).to be_nil
      end
    end

    describe "browser_guid blocking" do
      it "blocks and unblocks browser GUIDs properly" do
        guid = "browser-guid-12345"
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:browser_guid], guid, 1)

        blocked_object = BlockedObject.find_by(object_value: guid)
        expect(blocked_object.browser_guid?).to be true
        expect(blocked_object.blocked?).to be true
        expect(blocked_object.expires_at).to be_nil
      end
    end

    describe "product blocking" do
      it "blocks and unblocks products properly" do
        product_id = "product-123"
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:product], product_id, 1)

        blocked_object = BlockedObject.find_by(object_value: product_id)
        expect(blocked_object.product?).to be true
        expect(blocked_object.blocked?).to be true
        expect(blocked_object.expires_at).to be_nil
      end
    end

    describe "ip_address blocking with expiration" do
      it "automatically sets expiration for IP addresses" do
        ip = "192.168.1.100"
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:ip_address], ip, 1, expires_in: 6.months)

        blocked_object = BlockedObject.find_by(object_value: ip)
        expect(blocked_object.ip_address?).to be true
        expect(blocked_object.blocked?).to be true
        expect(blocked_object.expires_at.to_time).to be_within(1.minute).of(6.months.from_now)
      end
    end
  end

  describe "edge cases and error handling" do
    it "handles blocking the same object multiple times" do
      email = "duplicate@example.com"
      first_block = BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, 1)
      second_block = BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, 2)

      expect(first_block.id).to eq(second_block.id)
      expect(second_block.blocked_by).to eq(2)
      expect(BlockedObject.where(object_value: email).count).to eq(1)
    end

    it "handles empty object_value" do
      expect do
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], "", 1)
      end.not_to raise_error

      blocked_object = BlockedObject.find_by(object_value: "")
      expect(blocked_object).not_to be_nil
      expect(blocked_object.blocked?).to be true
    end

    it "handles nil blocking_user_id" do
      email = "no-user@example.com"
      blocked_object = BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, nil)

      expect(blocked_object.blocked_by).to be_nil
      expect(blocked_object.blocked?).to be true
    end

    it "updates blocked_by when re-blocking" do
      email = "reblock@example.com"
      first_block = BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, 1)
      expect(first_block.blocked_by).to eq(1)

      second_block = BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], email, 2)
      expect(second_block.blocked_by).to eq(2)
      expect(second_block.id).to eq(first_block.id)
    end

    it "handles very long object_values" do
      long_value = "a" * 1000
      expect do
        BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], long_value, 1)
      end.not_to raise_error
    end

    it "handles special characters in object_value" do
      special_value = "test+special@example.com"
      blocked_object = BlockedObject.block!(BLOCKED_OBJECT_TYPES[:email], special_value, 1)

      expect(blocked_object.object_value).to eq(special_value)
      expect(blocked_object.blocked?).to be true
    end
  end

  describe "scopes combinations" do
    let!(:active_email) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "active@example.com", blocked_at: Time.current, blocked_by: 1) }
    let!(:expired_email) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:email], object_value: "expired@example.com", blocked_at: 2.hours.ago, expires_at: 1.hour.ago, blocked_by: 1) }
    let!(:active_ip) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:ip_address], object_value: "192.168.1.1", blocked_at: Time.current, expires_at: 1.hour.from_now, blocked_by: 1) }
    let!(:active_browser) { BlockedObject.create!(object_type: BLOCKED_OBJECT_TYPES[:browser_guid], object_value: "active_browser", blocked_at: Time.current, blocked_by: 1) }

    it "combines email scope with active scope" do
      active_emails = BlockedObject.email.active
      expect(active_emails).to include(active_email)
      expect(active_emails).not_to include(expired_email)
      expect(active_emails).not_to include(active_ip)
      expect(active_emails).not_to include(active_browser)
      expect(active_emails.count).to eq(1)
    end

    it "combines ip_address scope with active scope" do
      active_ips = BlockedObject.ip_address.active
      expect(active_ips).to include(active_ip)
      expect(active_ips).not_to include(active_email)
      expect(active_ips).not_to include(expired_email)
      expect(active_ips).not_to include(active_browser)
      expect(active_ips.count).to eq(1)
    end

    it "combines browser_guid scope with active scope" do
      active_browsers = BlockedObject.browser_guid.active
      expect(active_browsers).to include(active_browser)
      expect(active_browsers).not_to include(active_email)
      expect(active_browsers).not_to include(active_ip)
      expect(active_browsers).not_to include(expired_email)
      expect(active_browsers.count).to eq(1)
    end

    it "counts objects across different types" do
      expect(BlockedObject.email.count).to eq(2) # active + expired
      expect(BlockedObject.ip_address.count).to eq(1)
      expect(BlockedObject.browser_guid.count).to eq(1)
      expect(BlockedObject.email_domain.count).to eq(0)
      expect(BlockedObject.charge_processor_fingerprint.count).to eq(0)
      expect(BlockedObject.product.count).to eq(0)
    end

    it "counts active objects across different types" do
      expect(BlockedObject.email.active.count).to eq(1) # only active
      expect(BlockedObject.ip_address.active.count).to eq(1)
      expect(BlockedObject.browser_guid.active.count).to eq(1)
      expect(BlockedObject.active.count).to eq(3) # total active
    end
  end
end
