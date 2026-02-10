# frozen_string_literal: true

require "spec_helper"
require "inertia_rails/rspec"

describe DiscoverController, type: :controller, inertia: true do
  let(:discover_domain_with_protocol) { UrlService.discover_domain_with_protocol }

  before do
    allow_any_instance_of(Link).to receive(:update_asset_preview)
    @buyer = create(:user)
    @product = create(:product, user: create(:user, name: "Gumstein"))
    sign_in @buyer
  end

  describe "#index" do
    it "renders the Discover Inertia page with recommendation props" do
      get :index

      expect(response).to be_successful
      expect_inertia.to render_component("Discover/Index")
      expect(inertia.props).to include(
        :currency_code,
        :search_results,
        :taxonomies_for_nav,
        :curated_product_ids,
        :show_black_friday_hero,
        :is_black_friday_page,
        :black_friday_offer_code,
        :black_friday_stats,
      )
      expect(inertia.props[:currency_code]).to eq(@buyer.currency_type)

      expect(inertia.props[:search_results]).to include(:products, :total, :tags_data, :filetypes_data)
      expect(inertia.props[:search_results][:products]).to be_an(Array)
      expect(inertia.props[:search_results][:total]).to be_a(Integer)

      expect(inertia.props[:taxonomies_for_nav]).to be_an(Array)
      if inertia.props[:taxonomies_for_nav].any?
        expect(inertia.props[:taxonomies_for_nav].first).to include(:slug, :label)
      end

      expect(inertia.props[:curated_product_ids]).to be_an(Array)
      expect(inertia.props[:curated_product_ids]).to all(be_a(String))
      expect(inertia.props[:show_black_friday_hero]).to be_in([true, false])
      expect(inertia.props[:is_black_friday_page]).to eq(false)
      expect(inertia.props[:black_friday_offer_code]).to eq(SearchProducts::BLACK_FRIDAY_CODE)
      expect(inertia.props[:black_friday_stats]).to satisfy { |value| value.nil? || value.is_a?(Hash) }
      expect(inertia.props[:recommended_products]).to be_an(Array)
      expect(inertia.props[:recommended_wishlists]).to be_an(Array)
    end

    it "sets black friday page props when offer code is provided" do
      allow(Feature).to receive(:active?).and_call_original
      allow(Feature).to receive(:active?).with(:offer_codes_search).and_return(true)

      get :index, params: { offer_code: SearchProducts::BLACK_FRIDAY_CODE }

      expect(response).to be_successful
      expect_inertia.to render_component("Discover/Index")
      expect(inertia.props[:is_black_friday_page]).to eq(true)
      expect(inertia.props[:black_friday_offer_code]).to eq(SearchProducts::BLACK_FRIDAY_CODE)
    end

    context "nav first render" do
      it "renders discover inertia payload for iPhone user-agent" do
        @request.user_agent = "Mozilla/5.0 (iPhone; CPU OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Mobile/15E148 Safari/604.1"

        get :index

        expect(response).to be_successful
        expect_inertia.to render_component("Discover/Index")
        expect(inertia.props[:taxonomies_for_nav]).to be_an(Array)
      end

      it "renders discover inertia payload for desktop user-agent" do
        @request.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36."

        get :index

        expect(response).to be_successful
        expect_inertia.to render_component("Discover/Index")
        expect(inertia.props[:taxonomies_for_nav]).to be_an(Array)
      end
    end

    context "when fetching recommendation props via inertia partial data" do
      before do
        request.headers["X-Inertia"] = "true"
        request.headers["X-Inertia-Partial-Component"] = "Discover/Index"
      end

      it "returns recommended products in partial props" do
        request.headers["X-Inertia-Partial-Data"] = "recommended_products"

        get :index

        expect(response).to be_successful
        props = response.parsed_body.fetch("props")
        expect(props["recommended_products"]).to be_an(Array)
        expect(props).not_to have_key("search_results")
      end

      it "returns recommended wishlists in partial props" do
        request.headers["X-Inertia-Partial-Data"] = "recommended_wishlists"

        get :index

        expect(response).to be_successful
        props = response.parsed_body.fetch("props")
        expect(props["recommended_wishlists"]).to be_an(Array)
        expect(props).not_to have_key("search_results")
      end
    end

    it "stores the search query" do
      cookies[:_gumroad_guid] = "custom_guid"

      expect do
        get :index, params: { taxonomy: "3d/3d-modeling", query: "stl files" }
      end.to change(DiscoverSearch, :count).by(1).and change(DiscoverSearchSuggestion, :count).by(1)

      expect(DiscoverSearch.last!.attributes).to include(
        "query" => "stl files",
        "taxonomy_id" => Taxonomy.find_by_path(["3d", "3d-modeling"]).id,
        "user_id" => @buyer.id,
        "ip_address" => "0.0.0.0",
        "browser_guid" => "custom_guid",
        "autocomplete" => false
      )
      expect(DiscoverSearch.last!.discover_search_suggestion).to be_present
    end

    context "meta tags" do
      let(:default_description) { "Browse over 1.6 million free and premium digital products in education, tech, design, and more categories from Gumroad creators and online entrepreneurs." }

      def meta_tags
        controller.send(:meta_tags)
      end

      it "sets the proper meta tags with no extra parameters" do
        get :index

        expect(meta_tags["meta-property-og-type"][:content]).to eq("website")
        expect(meta_tags["meta-property-og-description"][:content]).to eq(default_description)
        expect(meta_tags["meta-name-description"][:content]).to eq(default_description)
        expect(meta_tags["canonical"][:href]).to eq("#{discover_domain_with_protocol}/")
      end

      it "sets the proper meta tags when a search query was submitted" do
        get :index, params: { query: "tests" }

        expect(meta_tags["title"][:inner_content]).to eq("Search results for \"tests\" | Gumroad")
        expect(meta_tags["meta-property-og-description"][:content]).to eq(default_description)
        expect(meta_tags["meta-name-description"][:content]).to eq(default_description)
        expect(meta_tags["canonical"][:href]).to eq("#{discover_domain_with_protocol}/?query=tests")
      end

      it "sets the proper title when only taxonomy is present" do
        get :index, params: { taxonomy: "software-development/programming/c-sharp" }

        expect(meta_tags["title"][:inner_content]).to eq("Software Development » Programming » C# | Gumroad")
      end

      it "sets the proper title when tags and taxonomy are present" do
        get :index, params: { tags: "some-tag", taxonomy: "software-development/programming/c-sharp" }

        expect(meta_tags["title"][:inner_content]).to eq("some tag | Software Development » Programming » C# | Gumroad")
      end

      it "sets the proper meta tags when a specific tag has been selected" do
        get :index, params: { tags: "3d models" }

        description = "Browse over 0 3D assets including 3D models, CG textures, HDRI environments & more" \
                      " for VFX, game development, AR/VR, architecture, and animation."
        expect(meta_tags["title"][:inner_content]).to eq("Professional 3D Modeling Assets | Gumroad")
        expect(meta_tags["meta-property-og-description"][:content]).to eq(description)
        expect(meta_tags["meta-name-description"][:content]).to eq(description)
        expect(meta_tags["canonical"][:href]).to eq("#{discover_domain_with_protocol}/?tags=3d+models")
      end

      it "sets the proper meta tags when a specific tag has been selected with different formatting" do
        get :index, params: { tags: "3d      - mODELs" }

        description = "Browse over 0 3D assets including 3D models, CG textures, HDRI environments & more" \
                      " for VFX, game development, AR/VR, architecture, and animation."
        expect(meta_tags["title"][:inner_content]).to eq("Professional 3D Modeling Assets | Gumroad")
        expect(meta_tags["meta-property-og-description"][:content]).to eq(description)
        expect(meta_tags["meta-name-description"][:content]).to eq(description)
        expect(meta_tags["canonical"][:href]).to eq("#{discover_domain_with_protocol}/?tags=3d+models")
      end

      context "meta description total count" do
        let(:total_products) { Link::RECOMMENDED_PRODUCTS_PER_PAGE + 2 }

        before do
          total_products.times do
            product = create(:product, :recommendable)
            product.tag!("3d models")
          end
          Link.import(refresh: true, force: true)
        end

        it "sets the correct total search result size in the meta description" do
          get :index, params: { tags: "3d models" }

          description = "Browse over #{total_products} 3D assets including 3D models, CG textures, HDRI environments & more" \
                        " for VFX, game development, AR/VR, architecture, and animation."
          expect(meta_tags["meta-property-og-description"][:content]).to eq(description)
          expect(meta_tags["meta-name-description"][:content]).to eq(description)
        end
      end
    end
  end

  describe "#recommended_products" do
    it "returns recommended products when taxonomy is blank" do
      cart = create(:cart, user: @buyer)
      create(:cart_product, cart:, product: @product)
      recommended_product = create(:product)

      expect(RecommendedProducts::DiscoverService).to receive(:fetch).with(
        purchaser: @buyer,
        cart_product_ids: [@product.id],
        recommender_model_name: RecommendedProductsService::MODEL_SALES,
      ).and_return([RecommendedProducts::ProductInfo.new(recommended_product)])

      get :recommended_products, format: :json

      expect(response).to be_successful
      expect(response.parsed_body).to eq([ProductPresenter.card_for_web(product: recommended_product, request:).as_json])
    end

    it "returns random products from all top taxonomies when taxonomy is blank and no curated products" do
      top_taxonomies = Taxonomy.roots.to_a
      all_top_products = []

      top_taxonomies.each do |taxonomy|
        products = create_list(:product, 3, :recommendable, taxonomy:)
        all_top_products.concat(products)
      end

      Link.import(refresh: true, force: true)

      allow(Rails.cache).to receive(:fetch).and_call_original
      allow(Rails.cache).to receive(:fetch).with("discover_all_top_products", expires_in: 1.day).and_return(all_top_products)

      sampled_products = all_top_products.first(DiscoverController::RECOMMENDED_PRODUCTS_COUNT)
      allow(all_top_products).to receive(:sample).with(DiscoverController::RECOMMENDED_PRODUCTS_COUNT).and_return(sampled_products)

      get :recommended_products, format: :json

      expect(response).to be_successful

      expected_products = sampled_products.map do |product|
        ProductPresenter.card_for_web(
          product:,
          request:,
          target: Product::Layout::DISCOVER,
          recommended_by: RecommendationType::GUMROAD_DISCOVER_RECOMMENDATION
        ).as_json
      end

      expect(response.parsed_body).to match_array(expected_products)
    end

    it "returns search results when taxonomy is present" do
      taxonomy = Taxonomy.find_by!(slug: "3d")
      other_taxonomy = Taxonomy.find_or_create_by!(slug: "other")
      taxonomy_product = create(:product, :recommendable, taxonomy:)
      child_taxonomy_product = create(:product, :recommendable, taxonomy: taxonomy.children.first)
      create(:product, :recommendable, taxonomy: other_taxonomy)
      Link.import(refresh: true, force: true)

      get :recommended_products, params: { taxonomy: "3d" }, format: :json

      expect(response).to be_successful
      expect(response.parsed_body).to contain_exactly(
        ProductPresenter.card_for_web(product: taxonomy_product, request:, target: Product::Layout::DISCOVER, recommended_by: RecommendationType::GUMROAD_DISCOVER_RECOMMENDATION).as_json,
        ProductPresenter.card_for_web(product: child_taxonomy_product, request:, target: Product::Layout::DISCOVER, recommended_by: RecommendationType::GUMROAD_DISCOVER_RECOMMENDATION).as_json,
      )
    end
  end
end
