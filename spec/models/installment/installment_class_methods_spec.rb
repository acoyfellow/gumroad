# frozen_string_literal: true

require "spec_helper"

describe "InstallmentClassMethods"  do
  before do
    @creator = create(:named_user, :with_avatar)
    @installment = create(:installment, call_to_action_text: "CTA", call_to_action_url: "https://www.example.com", seller: @creator)
  end

  describe ".product_or_variant_with_sent_emails_for_purchases" do
    it "returns live product or variant installments that have been emailed to those purchasers" do
      product = create(:product)
      variant = create(:variant, variant_category: create(:variant_category, link: product))
      product_post = create(:installment, link: product, published_at: 1.day.ago)
      variant_post = create(:variant_installment, link: product, base_variant: variant, published_at: 1.day.ago)
      create(:seller_installment, seller: product.user)
      create(:installment, link: product, published_at: 1.day.ago, deleted_at: 1.day.ago)
      create(:variant_installment, link: product, base_variant: variant, published_at: nil)

      purchase = create(:purchase, link: product, variant_attributes: [variant])

      expect(Installment.product_or_variant_with_sent_emails_for_purchases([purchase.id])).to be_empty

      create(:creator_contacting_customers_email_info, installment: product_post, purchase:)
      expect(Installment.product_or_variant_with_sent_emails_for_purchases([purchase.id])).to match_array [product_post]

      create(:creator_contacting_customers_email_info, installment: variant_post, purchase:)
      expect(Installment.product_or_variant_with_sent_emails_for_purchases([purchase.id])).to match_array [product_post, variant_post]

      expect(Installment.product_or_variant_with_sent_emails_for_purchases([create(:purchase).id])).to be_empty
    end
  end

  describe ".seller_with_sent_emails_for_purchases" do
    it "returns live seller installments that have been emailed to those purchasers" do
      product = create(:product)
      purchase = create(:purchase, link: product)
      seller_post = create(:seller_installment, seller: product.user, published_at: 1.day.ago)
      create(:seller_installment, seller: product.user, published_at: 1.day.ago, deleted_at: 1.day.ago)
      create(:seller_installment, seller: product.user, published_at: nil)
      create(:installment, link: product, published_at: 1.day.ago)

      expect(Installment.seller_with_sent_emails_for_purchases([purchase.id])).to be_empty

      create(:creator_contacting_customers_email_info, installment: seller_post, purchase:)
      expect(Installment.seller_with_sent_emails_for_purchases([purchase.id])).to match_array [seller_post]
    end
  end

  describe ".profile_only_for_products" do
    it "returns live profile-only product posts for the given product IDs" do
      product1 = create(:product)
      product2 = create(:product)
      product1_post = create(:installment, link: product1, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      product2_post = create(:installment, link: product2, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:installment, link: product1, send_emails: false, shown_on_profile: true)
      create(:installment, link: product2, published_at: nil, send_emails: false, shown_on_profile: true)
      create(:installment, link: product2, published_at: 1.day.ago, deleted_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:installment, link: product1, published_at: 1.day.ago, shown_on_profile: true)
      create(:installment, link: product2, published_at: 1.day.ago)
      create(:installment, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)

      expect(Installment.profile_only_for_products([product1.id, product2.id])).to match_array [product1_post, product2_post]
    end
  end

  describe ".profile_only_for_variant_ids" do
    it "returns live profile-only variant posts for the given variant IDs" do
      product = create(:product)
      variant1 = create(:variant, variant_category: create(:variant_category, link: product))
      variant2 = create(:variant, variant_category: create(:variant_category, link: product))
      variant1_post = create(:variant_installment, link: product, base_variant: variant1, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      variant2_post = create(:variant_installment, link: product, base_variant: variant2, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:variant_installment, link: product, base_variant: variant1, published_at: nil, send_emails: false, shown_on_profile: true)
      create(:variant_installment, link: product, base_variant: variant1, published_at: 1.day.ago, deleted_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:variant_installment, link: product, base_variant: variant2, published_at: 1.day.ago, shown_on_profile: true)
      create(:variant_installment, link: product, base_variant: variant2, published_at: 1.day.ago)
      create(:installment, link: product, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)

      expect(Installment.profile_only_for_variants([variant1.id, variant2.id])).to match_array [variant1_post, variant2_post]
    end
  end

  describe ".profile_only_for_sellers" do
    it "returns live profile-only seller posts for the given seller IDs" do
      seller1 = create(:user)
      seller2 = create(:user)
      seller1_post = create(:seller_installment, seller: seller1, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      seller2_post = create(:seller_installment, seller: seller2, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:seller_installment, seller: seller1, published_at: nil, send_emails: false, shown_on_profile: true)
      create(:seller_installment, seller: seller2, published_at: 1.day.ago, deleted_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:seller_installment, seller: seller1, published_at: 1.day.ago, shown_on_profile: true)
      create(:seller_installment, seller: seller2, published_at: 1.day.ago)
      create(:seller_installment, published_at: 1.day.ago, send_emails: false, shown_on_profile: true)
      create(:installment, seller: seller1, published_at: 1.day.ago)

      expect(Installment.profile_only_for_sellers([seller1.id, seller2.id])).to match_array [seller1_post, seller2_post]
    end
  end

  describe ".for_products" do
    it "returns live, non-workflow product-posts for the given products" do
      product1 = create(:product)
      product2 = create(:product)
      product_ids = [product1.id, product2.id]
      posts = [
        create(:product_installment, :published, link: product1),
        create(:product_installment, :published, link: product2),
      ]
      create(:product_installment, link: product1)
      create(:product_installment, :published, link: product2, deleted_at: 1.day.ago)
      create(:product_installment, :published)
      create(:seller_installment, :published, seller: product1.user)
      create(:workflow_installment, :published, link: product1)

      expect(Installment.for_products(product_ids:)).to match_array posts
    end
  end

  describe ".for_variants" do
    it "returns live, non-workflow variant-posts for the given variants" do
      variant1 = create(:variant)
      variant2 = create(:variant)
      variant_ids = [variant1.id, variant2.id]
      posts = [
        create(:variant_installment, :published, base_variant: variant1),
        create(:variant_installment, :published, base_variant: variant2),
      ]
      create(:variant_installment, base_variant: variant1)
      create(:variant_installment, :published, base_variant: variant2, deleted_at: 1.day.ago)
      create(:variant_installment, :published)
      create(:seller_installment, :published, seller: variant1.user)
      create(:workflow_installment, :published, base_variant: variant1)

      expect(Installment.for_variants(variant_ids:)).to match_array posts
    end
  end

  describe ".for_sellers" do
    it "returns live, non-workflow seller-posts for the given sellers" do
      seller1 = create(:user)
      seller2 = create(:user)
      seller_ids = [seller1.id, seller2.id]
      posts = [
        create(:seller_installment, :published, seller: seller1),
        create(:seller_installment, :published, seller: seller2),
      ]
      create(:seller_installment, seller: seller1)
      create(:seller_installment, :published, seller: seller2, deleted_at: 1.day.ago)
      create(:seller_installment, :published)
      create(:product_installment, :published, seller: seller1)
      create(:variant_installment, :published, seller: seller1)
      create(:workflow_installment, :published, seller: seller1)

      expect(Installment.for_sellers(seller_ids:)).to match_array posts
    end
  end

  describe ".past_posts_to_show_for_products" do
    before do
      @enabled_product = create(:product, should_show_all_posts: true)
      @disabled_product = create(:product, should_show_all_posts: false)
      @enabled_product_post1 = create(:installment, link: @enabled_product, published_at: 1.day.ago)
      @enabled_product_post2 = create(:installment, link: @enabled_product, published_at: 1.day.ago)
      create(:installment, link: @enabled_product, published_at: nil)
      create(:installment, link: @disabled_product, published_at: 1.day.ago)
      workflow = create(:workflow, link: @enabled_product, workflow_type: Workflow::PRODUCT_TYPE)
      create(:installment, workflow:, link: @enabled_product, published_at: 1.day.ago)
    end

    it "returns live product posts for products with should_show_all_posts enabled" do
      expect(Installment.past_posts_to_show_for_products(product_ids: [@enabled_product.id, @disabled_product.id])).to match_array [@enabled_product_post1, @enabled_product_post2]
    end

    it "excludes certain post IDs, if provided" do
      expect(Installment.past_posts_to_show_for_products(product_ids: [@enabled_product.id, @disabled_product.id], excluded_post_ids: [@enabled_product_post1.id])).to match_array [@enabled_product_post2]
    end
  end

  describe ".past_posts_to_show_for_variants" do
    before do
      enabled_product = create(:product, should_show_all_posts: true)
      @enabled_variant = create(:variant, variant_category: create(:variant_category, link: enabled_product))
      @disabled_variant = create(:variant)
      @enabled_variant_post1 = create(:variant_installment, link: enabled_product, base_variant: @enabled_variant, published_at: 1.day.ago)
      @enabled_variant_post2 = create(:variant_installment, link: enabled_product, base_variant: @enabled_variant, published_at: 1.day.ago)
      create(:variant_installment, link: enabled_product, base_variant: @enabled_variant, published_at: nil)
      create(:variant_installment, link: @disabled_variant.link, base_variant: @disabled_variant, published_at: 1.day.ago)
    end

    it "returns live variant posts for variants whose products have should_show_all_posts enabled" do
      expect(Installment.past_posts_to_show_for_variants(variant_ids: [@enabled_variant.id, @disabled_variant.id])).to match_array [@enabled_variant_post1, @enabled_variant_post2]
    end

    it "excludes certain post IDs, if provided" do
      expect(Installment.past_posts_to_show_for_variants(variant_ids: [@enabled_variant.id, @disabled_variant.id], excluded_post_ids: [@enabled_variant_post1.id])).to match_array [@enabled_variant_post2]
    end
  end

  describe ".seller_posts_for_sellers" do
    before do
      @seller = create(:user)
      @seller_post1 = create(:seller_installment, seller: @seller, published_at: 1.day.ago)
      @seller_post2 = create(:seller_installment, seller: @seller, published_at: 1.day.ago)
      create(:seller_installment, seller: @seller, published_at: nil)
      create(:seller_installment, published_at: 1.day.ago)
    end

    it "returns live seller posts for the given seller IDs" do
      expect(Installment.seller_posts_for_sellers(seller_ids: [@seller.id])).to match_array [@seller_post1, @seller_post2]
    end

    it "excludes certain post IDs, if provided" do
      expect(Installment.seller_posts_for_sellers(seller_ids: [@seller.id], excluded_post_ids: [@seller_post1.id])).to match_array [@seller_post2]
    end
  end

  describe ".emailable_posts_for_purchase" do
    it "returns the product-, variant-, and seller-type posts for the purchase where send_emails is true" do
      product = create(:product)
      variant = create(:variant, variant_category: create(:variant_category, link: product))
      purchase = create(:purchase, link: product, variant_attributes: [variant])
      posts = [
        create(:product_installment, :published, link: product),
        create(:product_installment, :published, link: product),
        create(:variant_installment, :published, base_variant: variant),
        create(:seller_installment, :published, seller: product.user),
      ]
      create(:product_installment, :published, link: product, send_emails: false, shown_on_profile: true)
      create(:product_installment, link: product)
      create(:variant_installment, :published, base_variant: variant, deleted_at: 1.day.ago)
      create(:workflow_installment, link: product, seller: product.user)

      expect(Installment.emailable_posts_for_purchase(purchase:)).to match_array posts
    end
  end

  describe ".filter_by_product_id_if_present" do
    before do
      @creator = create(:named_user)
      @product = create(:product, name: "product name", user: @creator)
      @product_post = create(:installment, link: @product, name: "product update", message: "content for update post 1", published_at: Time.current, shown_on_profile: true, seller: @creator)
      @audience_post = create(:audience_installment, name: "audience update", message: "content for update post 1", seller: @creator, published_at: Time.current, shown_on_profile: true)

      another_product = create(:product, name: "product name", user: @creator)
      @another_product_post = create(:installment, link: another_product, name: "product update", message: "content for update post 1", published_at: Time.current, shown_on_profile: true, seller: @creator)
    end

    it "returns the proper product updates if filtered by product ID" do
      product_filtered_posts = Installment.filter_by_product_id_if_present(@product.id)

      expect(product_filtered_posts.length).to eq 1
      expect(product_filtered_posts).to include(@product_post)
      expect(product_filtered_posts).to_not include(@audience_post)
      expect(product_filtered_posts).to_not include(@another_product_post)
    end

    it "does not apply any scope if no product_id present" do
      product_filtered_posts = Installment.filter_by_product_id_if_present(nil)

      expect(product_filtered_posts.length).to eq 4
    end
  end

  describe ".missed_for_purchase" do
    before do
      @creator = create(:user)
      @product = create(:product, user: @creator)
      @purchase = create(:purchase, link: @product)
    end

    it "includes regular posts, seller posts, audience posts, same product workflow posts, and posts with bought_products filter" do
      regular_product_post = create(:installment, link: @product, seller: @creator, published_at: Time.current)
      seller_post_to_all_customers = create(:seller_installment, seller: @creator, published_at: 2.days.ago)
      audience_post = create(:audience_installment, seller: @creator, published_at: 2.days.ago)

      workflow_seller = create(:workflow, seller: @creator, link: nil, workflow_type: Workflow::SELLER_TYPE, published_at: Time.current)
      seller_workflow_post = create(:installment, seller: @creator, workflow: workflow_seller, published_at: Time.current)

      post_with_bought_products_filter = create(:seller_installment, seller: @creator, bought_products: [@product.unique_permalink, create(:product, user: @creator).unique_permalink], published_at: 2.days.ago)

      missed_posts = Installment.missed_for_purchase(@purchase)

      expect(missed_posts).to eq([
                                   regular_product_post,
                                   seller_post_to_all_customers,
                                   audience_post,
                                   seller_workflow_post,
                                   post_with_bought_products_filter
                                 ])
    end

    it "includes variant workflow posts when purchase has the variant" do
      regular_product_post = create(:installment, link: @product, seller: @creator, published_at: Time.current)

      variant_a = create(:variant, variant_category: create(:variant_category, link: @product))
      variant_b = create(:variant, variant_category: create(:variant_category, link: @product))

      purchase_with_variant_a = create(:purchase, link: @product, variant_attributes: [variant_a], seller: @creator)

      variant_a_workflow = create(:variant_workflow, seller: @creator, base_variant: variant_a, link: @product, published_at: Time.current)
      variant_a_workflow_post = create(:installment, link: @product, workflow: variant_a_workflow, seller: @creator, published_at: Time.current)

      variant_b_workflow = create(:variant_workflow, seller: @creator, base_variant: variant_b, link: @product, published_at: Time.current)
      _variant_b_workflow_post = create(:installment, link: @product, workflow: variant_b_workflow, seller: @creator, published_at: Time.current)

      missed_posts = Installment.missed_for_purchase(purchase_with_variant_a)

      expect(missed_posts).to eq([
                                   regular_product_post,
                                   variant_a_workflow_post
                                 ])
    end

    it "includes bundle product posts for bundle purchases" do
      bundle_product = create(:product, :bundle, user: @creator)
      bundle_purchase = create(:purchase, is_bundle_product_purchase: true, link: bundle_product, seller: @creator)
      bundle_post = create(:installment, link: bundle_product, seller: @creator, published_at: Time.current)

      missed_posts = Installment.missed_for_purchase(bundle_purchase)

      expect(missed_posts).to eq([bundle_post])
    end

    it "excludes already sent posts, posts from other sellers, posts from workflows for other products, and profile-only posts" do
      sent_installment = create(:installment, link: @product, seller: @creator, published_at: Time.current)
      create(:creator_contacting_customers_email_info, installment: sent_installment, purchase: @purchase)

      same_product_variant = create(:variant, variant_category: create(:variant_category, link: @product))
      same_product_variant_workflow = create(:variant_workflow, seller: @creator, base_variant: same_product_variant, link: @product, published_at: Time.current)
      _same_product_variant_workflow_post = create(:installment, link: @product, workflow: same_product_variant_workflow, seller: @creator, published_at: Time.current)


      product_b = create(:product, user: @creator)
      workflow_product_b = create(:workflow, seller: @creator, link: product_b, published_at: Time.current)
      _other_product_workflow_post = create(:installment, link: product_b, workflow: workflow_product_b, seller: @creator, published_at: Time.current)

      variant_product_b = create(:variant, variant_category: create(:variant_category, link: product_b))
      variant_workflow_product_b = create(:variant_workflow, seller: @creator, base_variant: variant_product_b, link: product_b, published_at: Time.current)
      _variant_workflow_post_product_b = create(:installment, link: product_b, workflow: variant_workflow_product_b, seller: @creator, published_at: Time.current)

      _post_from_other_seller = create(:installment, link: @product, seller: create(:user), published_at: Time.current)

      profile_only_product_post = create(:installment, link: @product, seller: @creator, published_at: 3.days.ago)
      profile_only_product_post.send_emails = false
      profile_only_product_post.shown_on_profile = true
      profile_only_product_post.save!
      profile_only_seller_post = create(:seller_installment, seller: @creator, bought_products: [@product.unique_permalink, create(:product, user: @creator).unique_permalink], published_at: 2.days.ago)
      profile_only_seller_post.send_emails = false
      profile_only_seller_post.shown_on_profile = true
      profile_only_seller_post.save!

      missed_posts = Installment.missed_for_purchase(@purchase)

      expect(missed_posts).to eq([])
    end
  end
end
