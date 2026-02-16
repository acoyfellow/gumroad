# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "shared_examples/collaborator_access"
require "shared_examples/product_edit"
require "shared_examples/sellers_base_controller_concern"
require "inertia_rails/rspec"

describe Products::MainController, inertia: true do
  it_behaves_like "inherits from Sellers::BaseController"

  let(:seller) { create(:named_seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    let(:product) { create(:product, user: seller) }

    it_behaves_like "returns 404 when product is not found", :get, :id, :edit

    it_behaves_like "authorize called for action", :get, :edit do
      let(:record) { product }
      let(:request_params) { { id: product.unique_permalink } }
    end

    it "renders the product edit page" do
      get :edit, params: { id: product.unique_permalink }

      expect(response).to be_successful
      presenter = controller.send(:product_presenter)
      expect(presenter.product).to eq(product)
      expect(presenter.pundit_user).to eq(controller.pundit_user)
      expect(inertia.props[:title]).to eq(product.name)
      expect(inertia).to render_component("Products/Edit")
      expect(inertia.props[:product][:unique_permalink]).to eq(product.unique_permalink)
      expect(inertia.props[:product][:name]).to eq(product.name)
      expect(inertia.props[:product][:price_cents]).to eq(product.price_cents)
      expect(inertia.props[:product][:native_type]).to eq(product.native_type)
      expect(inertia.props[:product][:is_published]).to eq(!product.draft && product.alive?)
      expect(inertia.props[:product][:variants]).to be_an(Array)
      expect(inertia.props[:product][:shipping_destinations]).to be_an(Array)
      expect(inertia.props[:product][:refund_policy]).to be_present
      expect(inertia.props[:page_metadata][:allowed_refund_periods_in_days]).to be_an(Array)
      expect(inertia.props[:page_metadata][:integration_names]).to be_present
      expect(inertia.props[:page_metadata][:available_countries]).to be_an(Array)
      expect(inertia.props[:page_metadata][:taxonomies]).to be_present
      expect(inertia.props[:page_metadata][:profile_sections]).to be_an(Array)
    end

    context "with other user not owning the product" do
      let(:other_user) { create(:user) }

      before do
        sign_in other_user
      end

      it "redirects to product page" do
        get :edit, params: { id: product.unique_permalink }
        expect(response).to redirect_to(short_link_path(product))
      end
    end

    context "with admin user signed in" do
      let(:admin) { create(:admin_user) }

      before do
        sign_in admin
      end

      it "renders the page" do
        get :edit, params: { id: product.unique_permalink }
        expect(response).to have_http_status(:ok)
      end
    end

    context "when the product is a bundle" do
      let(:bundle) { create(:product, :bundle) }

      it "redirects to the bundle edit page" do
        sign_in bundle.user
        get :edit, params: { id: bundle.unique_permalink }
        expect(response).to redirect_to(edit_bundle_product_path(bundle.external_id))
      end
    end
  end

  describe "PATCH update" do
    it_behaves_like "returns 404 when product is not found", :patch, :id, :update

    before do
      request.headers["X-Inertia"] = "true"
      request.headers["X-Inertia-Partial-Component"] = "Products/Edit"
      request.headers["X-Inertia-Partial-Data"] = "product, flash, errors"
      @product = create(:product_with_pdf_file, user: seller)
      @params = {
        id: @product.unique_permalink,
        product: {
          name: "sumlink",
          description: "New description",
          custom_button_text_option: "pay_prompt",
          custom_summary: "summary",
          custom_attributes: [
            {
              name: "name",
              value: "value"
            },
          ],
          file_attributes: [
            {
              name: "Length",
              value: "10 sections"
            }
          ],
          product_refund_policy_enabled: true,
          refund_policy: {
            max_refund_period_in_days: 7,
            fine_print: "Sample fine print",
          },
        },
      }
    end

    it_behaves_like "authorize called for action", :patch, :update do
      let(:record) { @product }
      let(:request_params) { @params }
    end

    it_behaves_like "collaborator can access", :patch, :update do
      let(:product) { @product }
      let(:request_params) { @params }
      let(:response_status) { 303 }
    end

    it_behaves_like "a product with offer code amount issues" do
      let(:product) { @product }
      let(:request_params) { @params }
      let(:redirect_path) { edit_product_path(@product.unique_permalink) }
    end

    it "does not publish the product" do
      @product.unpublish!
      patch :update, params: @params.deep_merge!({ product: { publish: true } }), as: :json

      expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
      expect(flash[:alert]).to eq("You cannot publish this product yet.")
      @product.reload
      expect(@product.purchase_disabled_at).to be_present
    end

    it_behaves_like "unpublishing a product" do
      let(:request_params) { @params }
      let(:product) { @product }
      let(:unpublish_redirect_path) { edit_product_path(@product.unique_permalink) }
    end

    describe "coffee products" do
      it "sets suggested_price_cents to the maximum price_difference_cents of variants" do
        coffee_product = create(:coffee_product)
        sign_in coffee_product.user

        patch :update, params: {
          id: coffee_product.unique_permalink,
          product: {
            variants: [
              { price_difference_cents: 300 },
              { price_difference_cents: 500 },
              { price_difference_cents: 100 }
            ]
          }
        }, as: :json

        expect(response).to be_redirect
        expect(coffee_product.reload.suggested_price_cents).to eq(500)
      end
    end

    describe "invalidate_action" do
      before do
        Rails.cache.write("views/#{@product.cache_key_prefix}_en_displayed_switch_ids_.html", "<html>hello</html>")
      end

      it "invalidates the action" do
        expect(Rails.cache.read("views/#{@product.cache_key_prefix}_en_displayed_switch_ids_.html")).to_not be_nil
        patch :update, params: @params, as: :json
        expect(Rails.cache.read("views/#{@product.cache_key_prefix}_en_displayed_switch_ids_.html")).to be_nil
      end
    end

    it "calls SaveContentUpsellsService when description changes and updates the product" do
      expect(SaveContentUpsellsService).to receive(:new).with(
        seller: @product.user,
        content: "New description",
        old_content: "This is a collection of works spanning 1984 — 1994, while I spent time in a shack in the Andes.",
      ).and_call_original

      patch :update, params: @params, as: :json

      expect(response).to be_redirect
      expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
      expect(flash[:notice]).to eq("Changes saved!")
      expect(@product.reload.name).to eq "sumlink"
      expect(@product.custom_button_text_option).to eq "pay_prompt"
      expect(@product.custom_summary).to eq "summary"
      expect(@product.custom_attributes).to eq [{ "name" => "name", "value" => "value" }]
      expect(@product.removed_file_info_attributes).to eq [:Size]
      expect(@product.product_refund_policy_enabled).to be(false)
      expect(@product.product_refund_policy).to be_nil
    end

    context "when seller_refund_policy_disabled_for_all feature flag is set to true" do
      before do
        Feature.activate(:seller_refund_policy_disabled_for_all)
      end

      it "updates the product refund policy" do
        patch :update, params: @params, as: :json
        @product.reload
        expect(@product.product_refund_policy_enabled).to be(true)
        expect(@product.product_refund_policy.title).to eq("7-day money back guarantee")
        expect(@product.product_refund_policy.fine_print).to eq("Sample fine print")
      end
    end

    context "when seller refund policy is set to false" do
      before do
        @product.user.update!(refund_policy_enabled: false)
      end

      it "updates the product refund policy" do
        patch :update, params: @params, as: :json
        @product.reload
        expect(@product.product_refund_policy_enabled).to be(true)
        expect(@product.product_refund_policy.title).to eq "7-day money back guarantee"
        expect(@product.product_refund_policy.fine_print).to eq "Sample fine print"
      end

      context "with product refund policy enabled" do
        before do
          @product.update!(product_refund_policy_enabled: true)
        end

        it "disables the product refund policy" do
          patch :update, params: @params.deep_merge(product: { product_refund_policy_enabled: false }), as: :json
          @product.reload
          expect(@product.product_refund_policy_enabled).to be(false)
          expect(@product.product_refund_policy).to be_nil
        end
      end
    end

    it "updates a physical product" do
      product = create(:physical_product, user: seller, skus_enabled: true)
      shipping_destination = product.shipping_destinations.first
      patch :update, params: {
        id: product.unique_permalink,
        product: {
          name: "physical",
          shipping_destinations: [
            {
              id: shipping_destination.id,
              country_code: shipping_destination.country_code,
              one_item_rate_cents: shipping_destination.one_item_rate_cents,
              multiple_items_rate_cents: shipping_destination.multiple_items_rate_cents
            }
          ]
        }
      }, as: :json
      expect(response).to be_redirect
      product.reload
      expect(product.name).to eq "physical"
      expect(product.skus_enabled).to be(false)
    end

    it "appends removed_file_info_attributes when additional keys are provided" do
      patch :update, params: @params.deep_merge(product: { file_attributes: [] }), as: :json
      expect(@product.reload.removed_file_info_attributes).to eq %i[Size Length]
    end

    it "sets the correct value for removed_file_info_attributes if there are none" do
      patch :update, params: @params.deep_merge(product: {
                                                  file_attributes: [
                                                    { name: "Length", value: "10 sections" },
                                                    { name: "Size", value: "100 TB" }
                                                  ]
                                                }), as: :json
      expect(@product.reload.removed_file_info_attributes).to eq []
    end

    describe "currency and price updates" do
      before do
        @product.update!(price_currency_type: "usd", price_cents: 1000)
      end

      it "changes product from USD $10 to EUR €12 and back to USD $11" do
        expect(@product.price_currency_type).to eq "usd"
        expect(@product.price_cents).to eq 1000

        patch :update, params: {
          id: @product.unique_permalink,
          product: {
            price_currency_type: "eur",
            price_cents: 1200
          }
        }, as: :json

        expect(response).to be_redirect
        expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
        expect(flash[:notice]).to eq("Changes saved!")
        @product.reload
        expect(@product.price_currency_type).to eq "eur"
        expect(@product.price_cents).to eq 1200

        patch :update, params: {
          id: @product.unique_permalink,
          product: {
            price_currency_type: "usd",
            price_cents: 1100
          }
        }, as: :json

        expect(response).to be_redirect
        expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
        expect(flash[:notice]).to eq("Changes saved!")
        @product.reload
        expect(@product.price_currency_type).to eq "usd"
        expect(@product.price_cents).to eq 1100
      end
    end

    describe "adding variants" do
      describe "variants" do
        it "adds variants to the product" do
          variants = [
            { name: "red", price_difference_cents: 400, max_purchase_count: 100 },
            { name: "blue", price_difference_cents: 300 }
          ]
          patch :update, params: { id: @product.unique_permalink, product: { variants: } }, as: :json

          variant1 = @product.alive_variants.first
          expect(variant1.name).to eq("red")
          expect(variant1.price_difference_cents).to eq(400)
          expect(variant1.max_purchase_count).to eq(100)
          variant2 = @product.alive_variants.second
          expect(variant2.name).to eq("blue")
          expect(variant2.price_difference_cents).to eq(300)
          expect(variant2.max_purchase_count).to eq(nil)
        end
      end

      describe "removing a variant from an existing category" do
        let(:category) { create(:variant_category, title: "sizes", link: @product) }
        let!(:variant1) { create(:variant, variant_category: category, name: "small", price_difference_cents: 200, max_purchase_count: 100) }
        let!(:variant2) { create(:variant, variant_category: category, name: "medium", price_difference_cents: 300) }

        it "persists the variants correctly" do
          variants = [
            { name: "small", id: variant1.external_id, price_difference_cents: 200, max_purchase_count: 100 }
          ]
          patch :update, params: { id: @product.unique_permalink, product: { variants: } }, as: :json

          expect(@product.reload.variant_categories.count).to eq(1)
          expect(@product.alive_variants.count).to eq(1)
          expect(variant1.reload).to be_alive
          expect(variant1.name).to eq("small")
          expect(variant1.price_difference_cents).to eq(200)
          expect(variant1.max_purchase_count).to eq(100)
          expect(variant2.reload).to be_deleted
        end
      end

      context "when all variants are removed" do
        let(:category) { create(:variant_category, title: "sizes", link: @product) }
        let!(:variant1) { create(:variant, variant_category: category, name: "small", price_difference_cents: 200, max_purchase_count: 100) }

        it "removes the category" do
          expect do
            patch :update, params: { id: @product.unique_permalink, product: { variants: [] } }, as: :json
          end.to change { @product.reload.variant_categories_alive.count }.from(1).to(0)
        end
      end
    end

    describe "subscription pricing" do
      let(:membership_product) { create(:membership_product, user: seller) }

      context "changing membership price update settings for a tier" do
        let(:tier) { membership_product.default_tier }
        let(:disabled_params) do
          {
            id: membership_product.unique_permalink,
            product: {
              variants: [
                {
                  id: tier.external_id,
                  name: tier.name,
                  apply_price_changes_to_existing_memberships: false,
                }
              ]
            }
          }
        end
        let(:effective_date) { 10.days.from_now.to_date }
        let(:enabled_params) do
          params = disabled_params.deep_dup
          params[:product][:variants][0][:apply_price_changes_to_existing_memberships] = true
          params[:product][:variants][0][:subscription_price_change_effective_date] = effective_date.strftime("%Y-%m-%d")
          params[:product][:variants][0][:subscription_price_change_message] = "hello"
          params
        end

        it "enables existing membership price upgrades" do
          patch :update, params: enabled_params, as: :json

          tier.reload
          expect(tier.apply_price_changes_to_existing_memberships).to eq true
          expect(tier.subscription_price_change_effective_date).to eq effective_date
          expect(tier.subscription_price_change_message).to eq "hello"
        end

        context "when existing membership price upgrades are enabled" do
          before do
            tier.update!(apply_price_changes_to_existing_memberships: true,
                         subscription_price_change_effective_date: effective_date,
                         subscription_price_change_message: "hello")
          end

          it "changes effective date to a later date and schedules emails to subscribers" do
            new_effective_date = 1.month.from_now.to_date
            enabled_params[:product][:variants][0][:subscription_price_change_effective_date] = new_effective_date.strftime("%Y-%m-%d")

            patch :update, params: enabled_params, as: :json

            expect(tier.reload.subscription_price_change_effective_date).to eq new_effective_date
            expect(ScheduleMembershipPriceUpdatesJob).to have_enqueued_sidekiq_job(tier.id)
          end

          it "changes effective date to an earlier date and schedules emails to subscribers" do
            new_effective_date = 7.days.from_now.to_date
            enabled_params[:product][:variants][0][:subscription_price_change_effective_date] = new_effective_date.strftime("%Y-%m-%d")

            patch :update, params: enabled_params, as: :json

            expect(tier.reload.subscription_price_change_effective_date).to eq new_effective_date
            expect(ScheduleMembershipPriceUpdatesJob).to have_enqueued_sidekiq_job(tier.id)
          end

          it "disables them" do
            patch :update, params: disabled_params, as: :json

            tier.reload
            expect(tier.apply_price_changes_to_existing_memberships).to eq false
            expect(tier.subscription_price_change_effective_date).to be_nil
            expect(tier.subscription_price_change_message).to be_nil
            expect(ScheduleMembershipPriceUpdatesJob).not_to have_enqueued_sidekiq_job(tier.id)
          end
        end
      end
    end

    describe "setting recurring prices on a variant" do
      before do
        @product = create(:membership_product, user: seller)
        @tier_category = @product.tier_category
        @recurring_params = {
          id: @product.unique_permalink,
          product: {
            variants: [
              {
                name: "First Tier",
                recurrence_price_values: {
                  monthly: { enabled: true, price_cents: 2000 },
                  quarterly: { enabled: true, price_cents: 4500 },
                  yearly: { enabled: true, price_cents: 12000 },
                  biannually: { enabled: false },
                  every_two_years: { enabled: true, price_cents: 20000 }
                },
              },
              {
                name: "Second Tier",
                recurrence_price_values: {
                  monthly: { enabled: true, price_cents: 1000 },
                  quarterly: { enabled: true, price_cents: 2500 },
                  yearly: { enabled: true, price_cents: 6000 },
                  biannually: { enabled: false },
                  every_two_years: { enabled: true, price_cents: 10000 }
                }
              }
            ]
          }
        }
      end

      it "sets the prices on the variants" do
        patch :update, params: @recurring_params, as: :json

        variants = @tier_category.reload.variants
        first_tier_prices = variants.find_by!(name: "First Tier").prices
        second_tier_prices = variants.find_by!(name: "Second Tier").prices

        expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::MONTHLY).price_cents).to eq 2000
        expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::QUARTERLY).price_cents).to eq 4500
        expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::YEARLY).price_cents).to eq 12000
        expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::EVERY_TWO_YEARS).price_cents).to eq 20000
        expect(first_tier_prices.find_by(recurrence: BasePrice::Recurrence::BIANNUALLY)).to be nil
        expect(second_tier_prices.find_by!(recurrence: BasePrice::Recurrence::MONTHLY).price_cents).to eq 1000
        expect(second_tier_prices.find_by!(recurrence: BasePrice::Recurrence::QUARTERLY).price_cents).to eq 2500
        expect(second_tier_prices.find_by!(recurrence: BasePrice::Recurrence::YEARLY).price_cents).to eq 6000
        expect(second_tier_prices.find_by!(recurrence: BasePrice::Recurrence::EVERY_TWO_YEARS).price_cents).to eq 10000
        expect(second_tier_prices.find_by(recurrence: BasePrice::Recurrence::BIANNUALLY)).to be nil
      end

      describe "cancellation discounts" do
        let(:cancellation_discount_params) do
          {
            discount: { type: "fixed", cents: "100" },
            duration_in_billing_cycles: "3"
          }
        end

        context "when cancellation_discounts feature flag is off" do
          it "does not update the cancellation discount" do
            expect(Product::SaveCancellationDiscountService).not_to receive(:new)
            patch :update, params: @recurring_params.deep_merge(product: { cancellation_discount: cancellation_discount_params }), as: :json
          end
        end

        context "when cancellation_discounts feature flag is on" do
          before do
            Feature.activate_user(:cancellation_discounts, @product.user)
          end

          it "updates the cancellation discount" do
            expect(Product::SaveCancellationDiscountService).to receive(:new).and_call_original
            patch :update, params: @recurring_params.deep_merge(product: { cancellation_discount: cancellation_discount_params }), as: :json
          end
        end
      end

      describe "default discount code" do
        let(:offer_code) { create(:offer_code, user: @product.user, products: [@product]) }
        let(:universal_offer_code) { create(:universal_offer_code, user: @product.user) }
        let(:other_user_offer_code) { create(:offer_code) }

        it "sets the default offer code when a valid product offer code is provided" do
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: offer_code.external_id }), as: :json
          expect(@product.reload.default_offer_code).to eq(offer_code)
        end

        it "sets the default offer code when a valid universal offer code is provided" do
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: universal_offer_code.external_id }), as: :json
          expect(@product.reload.default_offer_code).to eq(universal_offer_code)
        end

        it "does not set the default offer code when offer code belongs to another user" do
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: other_user_offer_code.external_id }), as: :json
          expect(@product.reload.default_offer_code).to be_nil
        end

        it "does not set the default offer code when offer code is not associated with the product" do
          unassociated_offer_code = create(:offer_code, user: @product.user)
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: unassociated_offer_code.external_id }), as: :json
          expect(@product.reload.default_offer_code).to be_nil
        end

        it "does not set the default offer code when offer code is expired" do
          expired_offer_code = create(:offer_code, user: @product.user, products: [@product], valid_at: 2.days.ago, expires_at: 1.day.ago)
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: expired_offer_code.external_id }), as: :json
          expect(@product.reload.default_offer_code).to be_nil
        end

        it "clears the default offer code when nil is provided" do
          @product.update!(default_offer_code: offer_code)
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: nil }), as: :json
          expect(@product.reload.default_offer_code).to be_nil
        end

        it "clears the default offer code when empty string is provided" do
          @product.update!(default_offer_code: offer_code)
          patch :update, params: @recurring_params.deep_merge(product: { default_offer_code_id: "" }), as: :json
          expect(@product.reload.default_offer_code).to be_nil
        end
      end

      context "with pay-what-you-want pricing" do
        it "sets the suggested prices" do
          pwyw_params = @recurring_params.deep_dup
          pwyw_params[:product][:variants] = [
            {
              name: "First Tier",
              customizable_price: true,
              recurrence_price_values: {
                monthly: { enabled: true, price_cents: 2000, suggested_price_cents: 2200 },
                quarterly: { enabled: true, price_cents: 4500, suggested_price_cents: 4700 },
                yearly: { enabled: true, price_cents: 12000, suggested_price_cents: 12200 },
                biannually: { enabled: false },
                every_two_years: { enabled: true, price_cents: 20000, suggested_price_cents: 21000 }
              }
            }
          ]

          patch :update, params: pwyw_params, as: :json

          first_tier = @tier_category.reload.variants.find_by(name: "First Tier")
          first_tier_prices = first_tier.prices
          expect(first_tier.customizable_price).to be true
          expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::MONTHLY).suggested_price_cents).to eq 2200
          expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::QUARTERLY).suggested_price_cents).to eq 4700
          expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::YEARLY).suggested_price_cents).to eq 12200
          expect(first_tier_prices.find_by!(recurrence: BasePrice::Recurrence::EVERY_TWO_YEARS).suggested_price_cents).to eq 21000
        end
      end
    end

    describe "shipping" do
      before do
        @product.is_physical = true
        @product.require_shipping = true
        @product.shipping_destinations << ShippingDestination.new(country_code: Product::Shipping::ELSEWHERE, one_item_rate_cents: 0, multiple_items_rate_cents: 0)
        @product.save!
      end

      it "does not accept duplicate submission for the same country for a product" do
        patch :update, params: {
          id: @product.unique_permalink,
          product: {
            shipping_destinations: [
              { country_code: "US", one_item_rate_cents: 1200, multiple_items_rate_cents: 600 },
              { country_code: "US", one_item_rate_cents: 1000, multiple_items_rate_cents: 500 }
            ]
          }
        }, as: :json

        expect(response).to be_redirect
        expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
        expect(flash[:alert]).to eq("Sorry, shipping destinations have to be unique.")
      end

      it "does not allow link to be saved if there are no shipping destinations" do
        patch :update, params: {
          id: @product.unique_permalink,
          product: {
            shipping_destinations: []
          }
        }, as: :json

        expect(response).to be_redirect
        expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
        expect(flash[:alert]).to eq("The product needs to be shippable to at least one destination.")
        expect(@product.reload.shipping_destinations.alive.size).to eq(1)
      end

      describe "virtual countries" do
        it "does not accept duplicate submission for the same country for a product" do
          patch :update, params: {
            id: @product.unique_permalink,
            product: {
              shipping_destinations: [
                { country_code: "EUROPE", one_item_rate_cents: 1200, multiple_items_rate_cents: 600 },
                { country_code: "EUROPE", one_item_rate_cents: 1000, multiple_items_rate_cents: 500 }
              ]
            }
          }, as: :json

          expect(response).to be_redirect
          expect(response).to redirect_to(edit_product_path(@product.unique_permalink))
          expect(flash[:alert]).to eq("Sorry, shipping destinations have to be unique.")
        end
      end
    end

    describe "custom attributes" do
      it "deletes custom attributes" do
        patch :update, params: @params.deep_merge(product: { custom_attributes: [] }), as: :json
        expect(@product.reload.custom_attributes).to eq []
      end

      it "ignores custom attributes with both blank name and blank value" do
        patch :update, params: @params.deep_merge(product: { custom_attributes: [{ name: "", value: "" }] }), as: :json
        expect(@product.reload.custom_attributes).to eq []
      end

      it "saves the custom attributes properly" do
        custom_attributes = [{ name: "author", value: "amir" }, { name: "chapters", value: "2" }]
        patch :update, params: @params.deep_merge(product: { custom_attributes: }), as: :json
        expect(@product.reload.custom_attributes).to eq custom_attributes.as_json
      end

      it "marks the product as allowing display of sales count if the should_show_sales_count param is true" do
        patch :update, params: @params.deep_merge(product: { should_show_sales_count: true }), as: :json
        expect(@product.reload.should_show_sales_count).to be(true)
      end

      it "marks the product as not allowing display of sales count if the should_show_sales_count param is false" do
        @product.update!(should_show_sales_count: true)
        patch :update, params: @params.deep_merge(product: { should_show_sales_count: false }), as: :json
        expect(@product.reload.should_show_sales_count).to be(false)
      end
    end

    describe "public files" do
      let(:public_file1) { create(:public_file, :with_audio, resource: @product, display_name: "Audio 1") }
      let(:public_file2) { create(:public_file, :with_audio, resource: @product, display_name: "Audio 2") }
      let(:description) do
        <<~HTML
           <p>Some text</p>
           <public-file-embed id="#{public_file1.public_id}"></public-file-embed>
           <p>Hello world!</p>
           <public-file-embed id="#{public_file2.public_id}"></public-file-embed>
           <p>More text</p>
        HTML
      end

      before do
        @product.update!(description:)
      end

      it "updates existing files and the product description appropriately" do
        files_params = [
          { "id" => public_file1.public_id, "name" => "Updated Audio 1", "status" => { "type" => "saved" } },
          { "id" => public_file2.public_id, "name" => "Updated Audio 2", "status" => { "type" => "saved" } },
          { "id" => "blob:http://example.com/audio.mp3", "name" => "Audio 3", "status" => { "type" => "uploading" } }
        ]

        patch :update, params: { id: @product.unique_permalink, product: { description:, public_files: files_params } }, as: :json

        expect(response).to be_redirect
        expect(public_file1.reload.attributes.values_at("display_name", "scheduled_for_deletion_at")).to eq(["Updated Audio 1", nil])
        expect(public_file2.reload.attributes.values_at("display_name", "scheduled_for_deletion_at")).to eq(["Updated Audio 2", nil])
        expect(@product.public_files.alive.count).to eq(2)
        expect(@product.reload.description).to eq(description)
      end

      it "schedules unused files for deletion" do
        unused_file = create(:public_file, :with_audio, resource: @product)
        files_params = [
          { "id" => public_file1.public_id, "name" => "Audio 1", "status" => { "type" => "saved" } }
        ]

        patch :update, params: { id: @product.unique_permalink, product: { description:, public_files: files_params } }, as: :json

        expect(response).to be_redirect
        expect(@product.public_files.alive.count).to eq(3)
        expect(@product.reload.description).to include(public_file1.public_id)
        expect(@product.description).to_not include(public_file2.public_id)
        expect(@product.description).to_not include(unused_file.public_id)
        expect(unused_file.reload.scheduled_for_deletion_at).to be_within(5.seconds).of(10.days.from_now)
        expect(public_file1.reload.scheduled_for_deletion_at).to be_nil
        expect(public_file2.reload.scheduled_for_deletion_at).to be_within(5.seconds).of(10.days.from_now)
      end

      it "removes invalid file embeds from content" do
        content_with_invalid_embeds = <<~HTML
           <p>Some text</p>
           <public-file-embed id="#{public_file1.public_id}"></public-file-embed>
           <p>Middle text</p>
           <public-file-embed id="nonexistent"></public-file-embed>
           <public-file-embed></public-file-embed>
           <p>More text</p>
        HTML
        files_params = [
          { "id" => public_file1.public_id, "name" => "Audio 1", "status" => { "type" => "saved" } },
          { "id" => public_file2.public_id, "name" => "Audio 2", "status" => { "type" => "saved" } },
        ]

        patch :update, params: { id: @product.unique_permalink, product: { description: content_with_invalid_embeds, public_files: files_params } }, as: :json

        expect(response).to be_redirect
        expect(@product.reload.description).to eq(<<~HTML
           <p>Some text</p>
           <public-file-embed id="#{public_file1.public_id}"></public-file-embed>
           <p>Middle text</p>


           <p>More text</p>
        HTML
        )
        expect(@product.public_files.alive.count).to eq(2)
        expect(public_file1.reload.scheduled_for_deletion_at).to be_nil
        expect(public_file2.reload.scheduled_for_deletion_at).to be_within(5.seconds).of(10.days.from_now)
      end

      it "handles missing public_files params" do
        patch :update, params: { id: @product.unique_permalink, product: { description: } }, as: :json

        expect(response).to be_redirect
        expect(@product.reload.description).to eq(<<~HTML
           <p>Some text</p>

           <p>Hello world!</p>

           <p>More text</p>
        HTML
        )
        expect(public_file1.reload.scheduled_for_deletion_at).to be_present
        expect(public_file2.reload.scheduled_for_deletion_at).to be_present
      end

      it "handles empty description" do
        files_params = [
          { "id" => public_file1.public_id, "status" => { "type" => "saved" } }
        ]

        patch :update, params: { id: @product.unique_permalink, product: { description: "", public_files: files_params } }, as: :json

        expect(response).to be_redirect
        expect(@product.reload.description).to eq("")
        expect(public_file1.reload.scheduled_for_deletion_at).to be_present
        expect(public_file2.reload.scheduled_for_deletion_at).to be_present
      end

      it "rolls back on error" do
        files_params = [
          { "id" => public_file1.public_id, "name" => "Updated Audio 1", "status" => { "type" => "saved" } }
        ]
        allow_any_instance_of(PublicFile).to receive(:save!).and_raise(ActiveRecord::RecordInvalid.new(public_file1))

        patch :update, params: { id: @product.unique_permalink, product: { description:, public_files: files_params } }, as: :json

        expect(response).not_to be_successful
        expect(public_file1.reload.display_name).to eq("Audio 1")
        expect(public_file1.reload.scheduled_for_deletion_at).to be_nil
        expect(public_file2.reload.scheduled_for_deletion_at).to be_nil
        expect(@product.reload.description).to eq(description)
      end
    end

    describe "adding integrations", :vcr do
      shared_examples "manages integrations" do
        it "adds a new integration" do
          expect do
            patch :update, params: @params.deep_merge(product: { integrations: { integration_name => new_integration_params } }), as: :json
          end.to change { Integration.count }.by(1)
            .and change { ProductIntegration.count }.by(1)

          product_integration = ProductIntegration.last
          integration = Integration.last

          expect(product_integration.integration).to eq(integration)
          expect(product_integration.product).to eq(@product)
          expect(integration.type).to eq(Integration.type_for(integration_name))

          new_integration_params.merge(new_integration_params.delete("integration_details")).each do |key, value|
            expect(integration.send(key)).to eq(value)
          end
        end

        it "modifies an existing integration" do
          @product.active_integrations << create("#{integration_name}_integration".to_sym)

          expect do
            patch :update, params: @params.deep_merge(product: { integrations: { integration_name => modified_integration_params } }), as: :json
          end.to change { Integration.count }.by(0)
            .and change { ProductIntegration.count }.by(0)

          product_integration = ProductIntegration.last
          integration = Integration.last

          expect(product_integration.integration).to eq(integration)
          expect(product_integration.product).to eq(@product)
          expect(integration.type).to eq(Integration.type_for(integration_name))
          modified_integration_params.merge(modified_integration_params.delete("integration_details")).each do |key, value|
            expect(integration.send(key)).to eq(value)
          end
        end
      end

      describe "circle integration" do
        let(:integration_name) { "circle" }
        let(:new_integration_params) do
          {
            "api_key" => GlobalConfig.get("CIRCLE_API_KEY"),
            "keep_inactive_members" => false,
            "integration_details" => { "community_id" => "0", "space_group_id" => "0" }
          }
        end
        let(:modified_integration_params) do
          {
            "api_key" => "modified_api_key",
            "keep_inactive_members" => true,
            "integration_details" => { "community_id" => "1", "space_group_id" => "1" }
          }
        end

        it_behaves_like "manages integrations"
      end

      describe "discord integration" do
        let(:server_id) { "0" }
        let(:integration_name) { "discord" }
        let(:new_integration_params) do
          {
            "keep_inactive_members" => false,
            "integration_details" => { "server_id" => server_id, "server_name" => "Gaming", "username" => "gumbot" }
          }
        end
        let(:modified_integration_params) do
          {
            "keep_inactive_members" => true,
            "integration_details" => { "server_id" => "1", "server_name" => "Tech", "username" => "techuser" }
          }
        end

        it_behaves_like "manages integrations"

        describe "disconnection" do
          let(:request_header) { { "Authorization" => "Bot #{DISCORD_BOT_TOKEN}" } }
          let!(:discord_integration) do
            integration = create(:discord_integration, server_id:)
            @product.active_integrations << integration
            integration
          end

          it "succeeds if bot is successfully removed from server" do
            WebMock.stub_request(:delete, "#{Discordrb::API.api_base}/users/@me/guilds/#{server_id}").
              with(headers: request_header).
              to_return(status: 204)

            expect do
              patch :update, params: { id: @product.unique_permalink, product: @params[:product].deep_merge!(integrations: {}) }, as: :json
            end.to change { @product.active_integrations.count }.by(-1)

            expect(@product.live_product_integrations.pluck(:integration_id)).to match_array []
          end

          it "fails if removing bot from server fails" do
            WebMock.stub_request(:delete, "#{Discordrb::API.api_base}/users/@me/guilds/#{server_id}").
              with(headers: request_header).
              to_return(status: 404, body: { code: Discordrb::Errors::UnknownMember.code }.to_json)

            expect do
              patch :update, params: { id: @product.unique_permalink, product: @params[:product].deep_merge!(integrations: {}) }, as: :json
            end.to change { @product.active_integrations.count }.by(0)

            expect(@product.live_product_integrations.pluck(:integration_id)).to match_array [discord_integration.id]
            expect(flash[:alert]).to eq("Could not disconnect the discord integration, please try again.")
          end
        end
      end

      describe "zoom integration" do
        let(:integration_name) { "zoom" }
        let(:new_integration_params) do
          {
            "keep_inactive_members" => false,
            "integration_details" => { "user_id" => "0", "email" => "test@zoom.com", "access_token" => "test_access_token", "refresh_token" => "test_refresh_token" }
          }
        end
        let(:modified_integration_params) do
          {
            "keep_inactive_members" => true,
            "integration_details" => { "user_id" => "1", "email" => "test2@zoom.com", "access_token" => "modified_access_token", "refresh_token" => "modified_refresh_token" }
          }
        end

        it_behaves_like "manages integrations"
      end

      describe "google calendar integration" do
        let(:integration_name) { "google_calendar" }
        let(:new_integration_params) do
          {
            "keep_inactive_members" => false,
            "integration_details" => { "calendar_id" => "0", "calendar_summary" => "Holidays", "access_token" => "test_access_token", "refresh_token" => "test_refresh_token" }
          }
        end
        let(:modified_integration_params) do
          {
            "keep_inactive_members" => true,
            "integration_details" => { "calendar_id" => "1", "calendar_summary" => "Meetings", "access_token" => "modified_access_token", "refresh_token" => "modified_refresh_token" }
          }
        end

        it_behaves_like "manages integrations"
        describe "disconnection" do
          let!(:google_calendar_integration) do
            integration = create(:google_calendar_integration)
            @product.active_integrations << integration
            integration
          end

          it "succeeds if the gumroad app is successfully disconnected from google account" do
            WebMock.stub_request(:post, "#{GoogleCalendarApi::GOOGLE_CALENDAR_OAUTH_URL}/revoke").
              with(query: { token: google_calendar_integration.access_token }).to_return(status: 200)

            expect do
              patch :update, params: { id: @product.unique_permalink, product: @params[:product].deep_merge!(integrations: {}) }, as: :json
            end.to change { @product.active_integrations.count }.by(-1)

            expect(@product.live_product_integrations.pluck(:integration_id)).to match_array []
          end

          it "fails if disconnecting the gumroad app from google fails" do
            WebMock.stub_request(:post, "#{GoogleCalendarApi::GOOGLE_CALENDAR_OAUTH_URL}/revoke").
              with(query: { token: google_calendar_integration.access_token }).to_return(status: 404)

            expect do
              patch :update, params: { id: @product.unique_permalink, product: @params[:product].deep_merge!(integrations: {}) }, as: :json
            end.to change { @product.active_integrations.count }.by(0)
            expect(@product.live_product_integrations.pluck(:integration_id)).to match_array [google_calendar_integration.id]
            expect(flash[:alert]).to eq("Could not disconnect the google calendar integration, please try again.")
          end
        end
      end
    end

    describe "custom domains" do
      context "with an existing domain" do
        let(:new_domain_name) { "example2.com" }

        context "when product has an existing custom domain" do
          before do
            create(:custom_domain, user: nil, product: @product, domain: "example-domain.com")
          end

          it "updates the custom_domain" do
            expect do
              patch :update, params: @params.deep_merge(product: { custom_domain: new_domain_name }), as: :json
            end.to change { @product.reload.custom_domain.domain }.from("example-domain.com").to(new_domain_name)
            expect(response).to be_redirect
          end

          context "when domain verification fails" do
            before do
              @product.custom_domain.update!(failed_verification_attempts_count: 2)
              allow_any_instance_of(CustomDomainVerificationService).to receive(:process).and_return(false)
            end

            it "does not increment the failed verification attempts count" do
              expect do
                patch :update, params: @params.deep_merge(product: { custom_domain: "invalid.example.com" }), as: :json
              end.not_to change { @product.reload.custom_domain.failed_verification_attempts_count }
            end
          end
        end

        context "when the product doesn't have an existing custom_domain" do
          it "creates a new custom_domain" do
            expect do
              patch :update, params: @params.deep_merge(product: { custom_domain: new_domain_name }), as: :json
            end.to change { CustomDomain.alive.count }.by(1)
            expect(@product.reload.custom_domain.domain).to eq new_domain_name
            expect(response).to be_redirect
          end
        end
      end
    end

    describe "error handling on save" do
      context "when Link::LinkInvalid is raised" do
        let(:product) { create(:product, user: seller) }

        it "logs and renders error message" do
          allow_any_instance_of(Link).to receive(:save!).and_raise(Link::LinkInvalid)

          patch :update, params: @params, as: :json

          expect(response).to have_http_status(:found)
        end
      end
    end

    describe "installment plans" do
      context "when product is eligible for installment plans" do
        let(:product) { create(:product, user: seller, price_cents: 1000) }

        context "no existing plans" do
          it "creates a new plan" do
            expect do
              patch :update, params: {
                id: product.unique_permalink,
                product: {
                  installment_plan: {
                    number_of_installments: 3,
                    recurrence: "monthly"
                  }
                }
              }, as: :json
            end.to change { ProductInstallmentPlan.alive.count }.by(1)

            plan = product.reload.installment_plan
            expect(plan.number_of_installments).to eq(3)
            expect(plan.recurrence).to eq("monthly")
          end
        end

        context "updating an existing plan" do
          let!(:existing_plan) do
            create(
              :product_installment_plan,
              link: product,
              number_of_installments: 2,
              recurrence: "monthly"
            )
          end

          context "has existing payment_options" do
            before do
              create(:payment_option, installment_plan: existing_plan)
              create(:installment_plan_purchase, link: product)
            end

            it "soft deletes the existing plan and creates a new plan" do
              expect do
                patch :update, params: {
                  id: product.unique_permalink,
                  product: {
                    installment_plan: {
                      number_of_installments: 4,
                      recurrence: "monthly"
                    }
                  }
                }, as: :json
              end.to change { existing_plan.reload.deleted_at }.from(nil)

              new_plan = product.reload.installment_plan
              expect(new_plan).to have_attributes(
                number_of_installments: 4,
                recurrence: "monthly"
              )
              expect(new_plan).not_to eq(existing_plan)

              expect do
                patch :update, params: {
                  id: product.unique_permalink,
                  product: {
                    installment_plan: {
                      number_of_installments: 4,
                      recurrence: "monthly"
                    }
                  }
                }, as: :json
              end.not_to change { new_plan.reload.deleted_at }
              expect(product.reload.installment_plan).to eq(new_plan)
            end
          end

          context "no existing payment_options" do
            it "destroys the existing plan and creates a new plan" do
              expect do
                patch :update, params: {
                  id: product.unique_permalink,
                  product: {
                    installment_plan: {
                      number_of_installments: 4,
                      recurrence: "monthly"
                    }
                  }
                }, as: :json
              end.not_to change { ProductInstallmentPlan.count }

              expect { existing_plan.reload }.to raise_error(ActiveRecord::RecordNotFound)
              new_plan = product.reload.installment_plan
              expect(new_plan).to have_attributes(
                number_of_installments: 4,
                recurrence: "monthly"
              )

              expect do
                patch :update, params: {
                  id: product.unique_permalink,
                  product: {
                    installment_plan: {
                      number_of_installments: 4,
                      recurrence: "monthly"
                    }
                  }
                }, as: :json
              end.not_to change { new_plan.reload.deleted_at }
              expect(product.reload.installment_plan).to eq(new_plan)
            end
          end
        end

        context "removing an existing plan" do
          let!(:existing_plan) do
            create(
              :product_installment_plan,
              link: product,
              number_of_installments: 2,
              recurrence: "monthly"
            )
          end

          context "has existing payment_options" do
            before do
              create(:payment_option, installment_plan: existing_plan)
              create(:installment_plan_purchase, link: product)
            end

            it "soft deletes the existing plan even if product is no longer eligible for installment plans" do
              expect do
                patch :update, params: {
                  id: product.unique_permalink,
                  product: {
                    price_cents: 0,
                    installment_plan: nil
                  }
                }, as: :json
              end.to change { existing_plan.reload.deleted_at }.from(nil)

              expect(product.reload.installment_plan).to be_nil
            end
          end

          context "no existing payment_options" do
            it "destroys the existing plan" do
              expect do
                patch :update, params: {
                  id: product.unique_permalink,
                  product: {
                    installment_plan: nil
                  }
                }, as: :json
              end.to change { ProductInstallmentPlan.count }.by(-1)

              expect { existing_plan.reload }.to raise_error(ActiveRecord::RecordNotFound)
              expect(product.reload.installment_plan).to be_nil
            end
          end
        end
      end

      context "when product is not eligible for installment plans" do
        let(:membership_product) { create(:membership_product, user: seller) }

        it "does not create an installment plan" do
          expect do
            patch :update, params: {
              id: membership_product.unique_permalink,
              product: {
                installment_plan: {
                  number_of_installments: 3,
                  recurrence: "monthly"
                }
              }
            }, as: :json
          end.not_to change { ProductInstallmentPlan.count }
        end
      end
    end

    describe "community chat" do
      context "when communities feature is enabled" do
        before do
          Feature.activate_user(:communities, seller)
        end

        it "enables community chat when requested" do
          patch :update, params: { id: @product.unique_permalink, product: { community_chat_enabled: true } }, as: :json

          expect(response).to be_redirect
          expect(@product.reload.community_chat_enabled?).to be(true)
          expect(@product.reload.active_community).to be_present
        end

        it "disables community chat when requested" do
          @product.update!(community_chat_enabled: true)

          patch :update, params: { id: @product.unique_permalink, product: { community_chat_enabled: false } }, as: :json

          expect(response).to be_redirect
          expect(@product.reload.community_chat_enabled?).to be(false)
          expect(@product.reload.active_community).to be_nil
        end

        it "does not enable community chat for coffee products" do
          seller.update!(created_at: (User::MIN_AGE_FOR_SERVICE_PRODUCTS + 1.day).ago)
          coffee_product = create(:product, user: seller, native_type: Link::NATIVE_TYPE_COFFEE, price_cents: 1000)

          patch :update, params: { id: coffee_product.unique_permalink, product: { community_chat_enabled: true, variants: [{ price_difference_cents: 1000 }] } }, as: :json
          expect(response).to be_redirect
          expect(coffee_product.reload.community_chat_enabled?).to be(false)
          expect(coffee_product.reload.active_community).to be_nil
        end

        it "does not enable community chat for bundle products" do
          @product.update!(native_type: Link::NATIVE_TYPE_BUNDLE)

          patch :update, params: { id: @product.unique_permalink, product: { community_chat_enabled: true } }, as: :json
          expect(response).to be_redirect
          expect(@product.reload.community_chat_enabled?).to be(false)
          expect(@product.reload.active_community).to be_nil
        end

        it "reactivates existing community when enabling chat" do
          community = create(:community, resource: @product, seller: seller)
          community.mark_deleted!
          @product.update!(community_chat_enabled: false)

          patch :update, params: { id: @product.unique_permalink, product: { community_chat_enabled: true } }, as: :json

          expect(response).to be_redirect
          expect(@product.reload.community_chat_enabled?).to be(true)
          expect(community.reload).to be_alive
        end
      end

      context "when communities feature is disabled" do
        before do
          Feature.deactivate_user(:communities, seller)
        end

        it "does not enable community chat" do
          patch :update, params: { id: @product.unique_permalink, product: { community_chat_enabled: true } }, as: :json

          expect(response).to be_redirect
          expect(@product.reload.community_chat_enabled?).to be(false)
          expect(@product.reload.active_community).to be_nil
        end
      end
    end
  end
end
