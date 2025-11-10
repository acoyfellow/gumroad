# frozen_string_literal: true

require "spec_helper"

describe "Admin::PurchasesController Scenario", type: :system, js: true do
  let(:admin) { create(:admin_user) }
  let(:purchase) { create(:purchase, purchaser: create(:user), is_deleted_by_buyer: true) }

  before do
    login_as(admin)
  end

  describe "undelete functionality" do
    it "shows undelete button for deleted purchases" do
      visit admin_purchase_path(purchase.id)

      expect(page).to have_button("Undelete")
    end

    it "does not show undelete button for non-deleted purchases" do
      purchase.update!(is_deleted_by_buyer: false)
      visit admin_purchase_path(purchase.id)

      expect(page).not_to have_button("Undelete")
    end

    it "allows undeleting purchase" do
      expect(purchase.reload.is_deleted_by_buyer).to be(true)

      visit admin_purchase_path(purchase.id)
      click_on "Undelete"
      accept_browser_dialog
      wait_for_ajax

      expect(purchase.reload.is_deleted_by_buyer).to be(false)
      expect(page).to have_button("Undeleted!")
    end
  end

  describe "resend receipt functionality" do
    let(:new_email) { "newemail@example.com" }

    before do
      purchase.update!(is_deleted_by_buyer: false)
    end

    it "successfully resends receipt with new email and shows success message" do
      visit admin_purchase_path(purchase.id)

      find("summary", text: "Resend receipt").click
      fill_in "resend_receipt[email_address]", with: new_email
      click_on "Send"
      accept_browser_dialog
      wait_for_ajax

      expect(page).to have_alert(text: "Receipt sent successfully.")
      expect(purchase.reload.email).to eq(new_email)
    end

    it "successfully resends receipt without changing email" do
      original_email = purchase.email
      visit admin_purchase_path(purchase.id)

      find("summary", text: "Resend receipt").click
      click_on "Send"
      accept_browser_dialog
      wait_for_ajax

      expect(page).to have_alert(text: "Receipt sent successfully.")
      expect(purchase.reload.email).to eq(original_email)
    end

    it "shows error message when resend fails due to invalid email" do
      visit admin_purchase_path(purchase.id)

      error = ActiveRecord::RecordInvalid.new(purchase)
      allow(error).to receive(:message).and_return("Validation failed: Email is invalid")
      allow_any_instance_of(Purchase).to receive(:save!).and_raise(error)

      find("summary", text: "Resend receipt").click
      fill_in "resend_receipt[email_address]", with: "test@example.com"
      click_on "Send"
      accept_browser_dialog
      wait_for_ajax

      expect(page).to have_alert(text: "Validation failed: Email is invalid")
    end
  end
end
