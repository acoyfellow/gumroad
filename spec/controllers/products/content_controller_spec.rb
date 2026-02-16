# frozen_string_literal: true

require "spec_helper"
require "shared_examples/authorize_called"
require "shared_examples/collaborator_access"
require "shared_examples/product_edit"
require "shared_examples/sellers_base_controller_concern"
require "inertia_rails/rspec"

describe Products::ContentController, inertia: true do
  it_behaves_like "inherits from Sellers::BaseController"

  let(:seller) { create(:named_seller) }
  let(:product) { create(:product_with_pdf_file, user: seller) }

  include_context "with user signed in as admin for seller"

  describe "GET edit" do
    it_behaves_like "returns 404 when product is not found", :get, :product_id, :edit

    it_behaves_like "authorize called for action", :get, :edit do
      let(:record) { product }
      let(:request_params) { { product_id: product.unique_permalink } }
    end

    it "renders the content edit page" do
      get :edit, params: { product_id: product.unique_permalink }

      expect(response).to be_successful
      presenter = controller.send(:product_presenter)
      expect(presenter.product).to eq(product)
      expect(presenter.pundit_user).to eq(controller.pundit_user)
      expect(inertia.props[:title]).to eq(product.name)
      expect(inertia.component).to eq("Products/Content/Edit")
      expect(inertia.props[:product][:unique_permalink]).to eq(product.unique_permalink)
      expect(inertia.props[:product][:name]).to eq(product.name)
      expect(inertia.props[:product][:rich_content]).to be_an(Array)
      expect(inertia.props[:product][:variants]).to be_an(Array)
      expect(inertia.props[:product][:is_published]).to eq(product.published?)
      expect(inertia.props[:existing_files]).to be_an(Array)
      expect(inertia.props[:page_metadata][:aws_key]).to eq(AWS_ACCESS_KEY)
      expect(inertia.props[:page_metadata][:s3_url]).to eq("#{AWS_S3_ENDPOINT}/#{S3_BUCKET}")
      expect(inertia.props[:page_metadata][:dropbox_picker_app_key]).to eq(DROPBOX_PICKER_API_KEY)
      expect(inertia.props[:page_metadata][:seller]).to be_present
    end

    context "for partial visits" do
      let(:expected_existing_files) do
        product_file = product.product_files.first
        [{ attached_product_name: product.name, extension: "PDF", file_name: "Display Name", display_name: "Display Name", description: "Description", file_size: 50, id: product_file.external_id, is_pdf: true, pdf_stamp_enabled: false, is_streamable: false, stream_only: false, is_transcoding_in_progress: false, isbn: nil, pagelength: 3, duration: nil, subtitle_files: [], url: product_file.url, thumbnail: nil, status: { type: "saved" } }]
      end

      before do
        request.headers["X-Inertia"] = "true"
        request.headers["X-Inertia-Partial-Component"] = "Products/Content/Edit"
        request.headers["X-Inertia-Partial-Data"] = "existing_files"
      end

      it "returns existing_files with expected structure" do
        get :edit, params: { product_id: product.unique_permalink }

        expect(response).to be_successful
        expect(inertia.props.deep_symbolize_keys[:existing_files]).to eq(expected_existing_files)
      end
    end
  end

  describe "PATCH update" do
    before do
      @gif_file = fixture_file_upload("test-small.gif", "image/gif")
      product_file = product.product_files.alive.first
      request.headers["X-Inertia"] = "true"
      request.headers["X-Inertia-Partial-Component"] = "Products/Content/Edit"
      request.headers["X-Inertia-Partial-Data"] = "product, flash, errors"
      @params = {
        product_id: product.unique_permalink,
        product: {
          rich_content: [],
          files: [
            {
              id: product_file.external_id,
              url: product_file.url
            }
          ],
          variants: [],
        },
      }
    end

    it_behaves_like "returns 404 when product is not found", :patch, :product_id, :update

    it_behaves_like "authorize called for action", :patch, :update do
      let(:record) { product }
      let(:request_params) { @params }
    end

    it_behaves_like "collaborator can access", :patch, :update do
      let(:request_format) { :json }
      let(:request_params) { @params }
      let(:response_status) { 303 }
    end

    it_behaves_like "a product with offer code amount issues" do
      let(:request_params) { @params }
      let(:redirect_path) { edit_product_content_path(product.unique_permalink) }
    end

    context "when publishing" do
      it_behaves_like "publishing a product" do
        let(:request_params) { @params }
        let(:publish_failure_redirect_path_for_product) { edit_product_content_path(product.unique_permalink) }
        let(:publish_failure_redirect_path_for_unpublished_product) { edit_product_content_path(unpublished_product.unique_permalink) }
      end

      it "allows publishing a product without files" do
        product_without_files = create(:product, user: seller, purchase_disabled_at: Time.current)

        patch :update, params: { product_id: product_without_files.unique_permalink, product: { rich_content: [], files: [], variants: [], publish: true } }, as: :json

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_share_path(product_without_files.unique_permalink))
        expect(flash[:notice]).to eq("Published!")
        product_without_files.reload
        expect(product_without_files.purchase_disabled_at).to be_nil
        expect(product_without_files.alive_product_files.count).to eq(0)
      end
    end

    it_behaves_like "unpublishing a product" do
      let(:request_params) { @params }
      let(:unpublish_redirect_path) { edit_product_content_path(product.unique_permalink) }
    end

    it "only updates content tab fields" do
      original_name = product.name
      original_price = product.price_cents

      patch :update, params: @params.deep_merge!({ product: { name: "New Name", price_cents: 9999 } }), as: :json

      expect(response).to have_http_status(:see_other)
      expect(response).to redirect_to(edit_product_content_path(product.unique_permalink))
      expect(flash[:notice]).to eq("Changes saved!")
      product.reload
      expect(product.name).to eq(original_name)
      expect(product.price_cents).to eq(original_price)
    end

    it "sets flash inertia with new_email_url path when content is updated and product has sales" do
      allow_any_instance_of(Link).to receive(:successful_sales_count).and_return(1)
      patch :update, params: @params.deep_merge!(product: {
                                                   rich_content: [{ id: nil, title: "Page title", description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Updated" }] }] } }],
                                                 }), as: :json

      expect(response).to have_http_status(:see_other)
      expect(flash[:inertia][:status]).to eq("frontend_alert_contents_updated")
      expect(flash[:inertia][:data][:new_email_url]).to eq(Rails.application.routes.url_helpers.new_email_url(template: "content_updates", product: product.unique_permalink, bought: [product.unique_permalink], only_path: true))
    end

    it "returns error on validation failure" do
      allow_any_instance_of(Link).to receive(:save!).and_raise(ActiveRecord::RecordInvalid.new(product))

      patch :update, params: @params, as: :json

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(edit_product_content_path(product.unique_permalink))
    end

    describe "licenses" do
      context "when license key is embedded in the product-level rich content" do
        it "sets is_licensed to true" do
          expect(product.is_licensed).to be(false)

          patch :update, params: @params.deep_merge!(product: { rich_content: [{ id: nil, title: "Page title", description: { type: "doc", content: [{ "type" => "licenseKey" }] } }] }), as: :json

          expect(response).to have_http_status(:see_other)
          expect(product.reload.is_licensed).to be(true)
        end
      end

      context "when license key is embedded in the rich content of at least one version" do
        it "sets is_licensed to true" do
          category = create(:variant_category, link: product, title: "Versions")
          version1 = create(:variant, variant_category: category, name: "Version 1")
          version2 = create(:variant, variant_category: category, name: "Version 2")
          version1_rich_content1 = create(:rich_content, entity: version1, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }])
          version1_rich_content1_updated_description = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }, { type: "licenseKey" }] }
          version2_new_rich_content_description = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Newly added version 2 content" }] }] }

          expect(product.is_licensed).to be(false)

          patch :update, params: @params.deep_merge!(product: {
                                                       variants: [
                                                         { id: version1.external_id, name: version1.name, rich_content: [{ id: version1_rich_content1.external_id, title: "Version 1 - Page 1", description: version1_rich_content1_updated_description }] },
                                                         { id: version2.external_id, name: version2.name, rich_content: [{ id: nil, title: "Version 2 - Page 1", description: version2_new_rich_content_description }] },
                                                       ],
                                                     }), as: :json

          expect(response).to have_http_status(:see_other)
          expect(product.reload.is_licensed).to be(true)
        end
      end

      it "sets is_licensed to false when no license key is embedded in the rich content" do
        expect(product.is_licensed).to be(false)

        patch :update, params: @params.deep_merge!(product: {
                                                     rich_content: [{ id: nil, title: "Page title", description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] } }],
                                                   }), as: :json

        expect(response).to have_http_status(:see_other)
        expect(product.reload.is_licensed).to be(false)
      end
    end

    describe "content_updated_at" do
      it "is updated when a new file is uploaded" do
        freeze_time do
          url = "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png"
          patch :update, params: @params.deep_merge!(product: { files: [{ id: SecureRandom.uuid, url: }] }), as: :json

          expect(response).to have_http_status(:see_other)
          expect(product.reload.content_updated_at).to eq Time.current
        end
      end

      it "is not updated when irrelevant attributes are changed" do
        freeze_time do
          patch :update, params: @params.deep_merge!(product: { rich_content: [] }), as: :json

          expect(response).to have_http_status(:see_other)
          expect(product.reload.content_updated_at).to be_nil
        end
      end
    end

    describe "without files" do
      it "allows updating a published product to have no files" do
        expect do
          patch :update, params: @params.deep_merge!(product: { files: [] }), as: :json
        end.to change { Link.find(product.id).alive_product_files.count }.from(1).to(0)

        expect(response).to have_http_status(:see_other)
        expect(response).to redirect_to(edit_product_content_path(product.unique_permalink))
      end
    end

    describe "multiple files" do
      def files_data_from_urls(urls)
        urls.map { { id: SecureRandom.uuid, url: _1 } }
      end

      it "preserves correct s3 key for s3 files containing percent and ampersand" do
        urls = ["#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/specs/test file %26 & ) %29.txt"]
        patch :update, params: @params.deep_merge!(product: { files: files_data_from_urls(urls) }), as: :json
        expect(response).to have_http_status(:see_other)
        product_file = product.alive_product_files.first
        expect(product_file.s3_key).to eq "specs/test file %26 & ) %29.txt"
      end

      it "saves the files properly" do
        urls = ["#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png",
                "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/manual.pdf"]
        patch :update, params: @params.deep_merge!(product: { files: files_data_from_urls(urls) }), as: :json
        expect(response).to have_http_status(:see_other)
        expect(product.reload.alive_product_files.count).to eq 2
        expect(product.alive_product_files[0].url).to eq "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png"
        expect(product.alive_product_files[1].url).to eq "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/manual.pdf"
      end

      it "has pdf filetype" do
        urls = ["#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png",
                "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/manual.pdf"]
        patch :update, params: @params.deep_merge!(product: { files: files_data_from_urls(urls) }), as: :json
        expect(response).to have_http_status(:see_other)
        expect(product.reload.has_filetype?("pdf")).to be(true)
      end

      it "supports deleting and adding files" do
        product.product_files << create(:product_file, link: product, url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png")
        product.save!

        urls = ["#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/manual.pdf"]
        patch :update, params: @params.deep_merge(product: { files: files_data_from_urls(urls) }), as: :json
        expect(response).to have_http_status(:see_other)
        expect(product.reload.alive_product_files.count).to eq 1
        expect(product.alive_product_files.first.url).to eq "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/manual.pdf"
      end

      it "allows 0 files for unpublished product" do
        product.purchase_disabled_at = Time.current
        product.product_files << create(:product_file, link: product, url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png")
        product.save!

        patch :update, params: @params.deep_merge(product: { files: {} }), as: :json
        expect(response).to have_http_status(:see_other)
      end

      it "updates product's rich content when file embed IDs exist in product_rich_content" do
        urls = %W[#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png #{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/manual.pdf]
        files_data = files_data_from_urls(urls)
        rich_content = create(:product_rich_content, entity: product, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }])
        old_rich_content = rich_content.description
        product_rich_content = [{ id: rich_content.external_id, title: "Page title", description: { type: "doc", content: old_rich_content.dup.concat([{ "type" => "fileEmbed", "attrs" => { "id" => files_data[0][:id], "uid" => "64e84875-c795-567c-d2dd-96336ab093d5" } }, { "type" => "fileEmbed", "attrs" => { "id" => files_data[1][:id], "uid" => "0c042930-2df1-4583-82ef-a6317213868d" } }]) } }]

        patch :update, params: @params.deep_merge(product: { rich_content: product_rich_content, files: files_data }), as: :json
        expect(response).to have_http_status(:see_other)
        new_external_id_1, new_external_id_2 = product.product_files.alive.map(&:external_id)
        expect(product.reload.rich_content_json).to eq([{ id: rich_content.external_id, page_id: rich_content.external_id, variant_id: nil, title: "Page title", description: { type: "doc", content: old_rich_content.dup.concat([{ "type" => "fileEmbed", "attrs" => { "id" => new_external_id_1, "uid" => "64e84875-c795-567c-d2dd-96336ab093d5" } }, { "type" => "fileEmbed", "attrs" => { "id" => new_external_id_2, "uid" => "0c042930-2df1-4583-82ef-a6317213868d" } }]) }, updated_at: rich_content.reload.updated_at }])
      end

      it "saves variant-level rich content containing file embeds with the persisted IDs" do
        external_id1 = "ext1"
        external_id2 = "ext2"
        category = create(:variant_category, link: product, title: "Versions")
        version1 = create(:variant, variant_category: category, name: "Version 1")
        version2 = create(:variant, variant_category: category, name: "Version 2")
        version1_rich_content1 = create(:rich_content, entity: version1, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }])
        version1_rich_content2 = create(:rich_content, entity: version1, deleted_at: 1.day.ago)
        version1_rich_content3 = create(:rich_content, entity: version1)
        another_product_version_rich_content = create(:rich_content, entity: create(:variant))
        version1_rich_content1_updated_description = [{ "type" => "fileEmbed", "attrs" => { "id" => external_id1, "uid" => "64e84875-c795-567c-d2dd-96336ab093d5" } }, { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }]
        version1_new_rich_content_description = [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Newly added version 1 content" }] }]
        version2_new_rich_content_description = [{ "type" => "fileEmbed", "attrs" => { "id" => external_id2, "uid" => "0c042930-2df1-4583-82ef-a6317213868d" } }]

        patch :update, params: @params.deep_merge(product: {
                                                    files: [{ id: external_id1, url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/#{external_id1}/original/pencil.png" }, { id: external_id2, url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/#{external_id2}/original/manual.pdf" }],
                                                    variants: [{ id: version1.external_id, name: version1.name, rich_content: [{ id: version1_rich_content1.external_id, title: "Version 1 - Page 1", description: { type: "doc", content: version1_rich_content1_updated_description } }, { id: nil, title: "Version 1 - Page 2", description: { type: "doc", content: version1_new_rich_content_description } }] }, { id: version2.external_id, name: version2.name, rich_content: [{ id: nil, title: "Version 2 - Page 1", description: { type: "doc", content: version2_new_rich_content_description } }] }],
                                                  }), as: :json
        expect(response).to have_http_status(:see_other)
        expect(version1_rich_content1.reload.deleted?).to be(false)
        expect(version1_rich_content2.reload.deleted?).to be(true)
        expect(version1_rich_content3.reload.deleted?).to be(true)
        expect(version1.rich_contents.count).to eq(4)
        expect(version1.alive_rich_contents.count).to eq(2)
        version1_new_rich_content = version1.alive_rich_contents.last
        expect(version1_new_rich_content.description).to eq(version1_new_rich_content_description)
        expect(version2.rich_contents.count).to eq(1)
        expect(version2.alive_rich_contents.count).to eq(1)
        expect(another_product_version_rich_content.reload.deleted?).to be(false)
      end

      it "calls SaveContentUpsellsService when rich content changes" do
        rich_content = create(:product_rich_content, entity: product, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Original content" }] }])
        product_rich_content = [{ id: rich_content.external_id, title: "Page title", description: { type: "doc", content: [{ "type" => "paragraph", "content": [{ "type" => "text", "text" => "New content" }] }] } }]

        expect(SaveContentUpsellsService).to receive(:new).with(
          seller: product.user,
          content: [
            ActionController::Parameters.new(
              {
                "type" => "paragraph",
                "content" => [
                  ActionController::Parameters.new(
                    {
                      "type" => "text",
                      "text" => "New content"
                    }).permit!
                ]
              }
            ).permit!
          ],
          old_content: [
            {
              "type" => "paragraph",
              "content" => [
                {
                  "type" => "text",
                  "text" => "Original content"
                }
              ]
            }
          ]
        ).and_call_original

        patch :update, params: @params.deep_merge(product: { rich_content: product_rich_content }), as: :json
        expect(response).to have_http_status(:see_other)
      end

      it "saves the product file thumbnails" do
        product_file1 = create(:streamable_video, link: product)
        product_file2 = create(:readable_document, link: product)
        product.product_files << product_file1
        product.product_files << product_file2
        blob = ActiveStorage::Blob.create_and_upload!(io: Rack::Test::UploadedFile.new(Rails.root.join("spec", "support", "fixtures", "smilie.png"), "image/png"), filename: "smilie.png")
        blob.analyze
        files_data = [{ id: product_file1.external_id, url: product_file1.url, thumbnail: { signed_id: blob.signed_id } }, { id: product_file2.external_id, url: product_file2.url }]

        expect do
          patch :update, params: @params.deep_merge(product: { files: files_data }), as: :json
        end.to change { product_file1.reload.thumbnail.blob }.from(nil).to(blob)

        expect(product_file2.reload.thumbnail.blob).to be_nil
        expect(response).to have_http_status(:see_other)

        expect do
          patch :update, params: { product_id: product.unique_permalink, product: @params[:product].merge(files: files_data) }, as: :json
        end.not_to change { product_file1.reload.thumbnail.blob }
      end

      it "enqueues a RenameProductFileWorker job" do
        product.product_files << create(:product_file, link: product, url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}/attachment/pencil.png")
        product.save!
        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            files: [
              {
                id: product.product_files.last.external_id,
                display_name: "sample",
                description: "new description",
                url: product.product_files.last.url,
              }
            ],
            rich_content: [],
          },
        }, as: :json
        expect(response).to have_http_status(:see_other)
        product_file = product.alive_product_files.last.reload

        expect(product_file.display_name).to eq("sample")
        expect(product_file.description).to eq("new description")
        expect(RenameProductFileWorker).to have_enqueued_sidekiq_job(product_file.id)
      end
    end

    describe "rich content" do
      let(:rich_content_product) { create(:product, user: seller) }

      it "saves the rich content pages in the given order" do
        updated_rich_content1_description = [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }, { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "World" }] }]
        new_rich_content_description = [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Newly added" }] }]
        rich_content1 = create(:product_rich_content, title: "p1", position: 0, entity: rich_content_product, description: [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }])
        rich_content2 = create(:product_rich_content, title: "p2", position: 1, entity: rich_content_product, deleted_at: 1.day.ago)
        rich_content3 = create(:product_rich_content, title: "p3", position: 2, entity: rich_content_product)
        rich_content4 = create(:product_rich_content, title: "p4", position: 3, entity: rich_content_product)
        another_product_rich_content = create(:product_rich_content)

        expect(rich_content_product.alive_rich_contents.sort_by(&:position).pluck(:title, :position)).to eq([["p1", 0], ["p3", 2], ["p4", 3]])

        params = {
          product_id: rich_content_product.unique_permalink,
          product: {
            rich_content: [
              { id: rich_content4.external_id, title: "Intro", description: { type: "doc", content: [{ "type" => "paragraph" }] } },
              { id: rich_content1.external_id, title: "Page 1", description: { type: "doc", content: updated_rich_content1_description } },
              { title: "Page 2", description: { type: "doc", content: new_rich_content_description } },
              { title: "Page 3", description: nil },
            ],
          },
        }
        patch :update, params: params, as: :json

        expect(response).to have_http_status(:see_other)
        expect(rich_content1.reload.deleted?).to be(false)
        expect(rich_content1.description).to eq(updated_rich_content1_description)
        expect(rich_content2.reload.deleted?).to be(true)
        expect(rich_content3.reload.deleted?).to be(true)
        expect(rich_content4.reload.deleted?).to be(false)
        expect(another_product_rich_content.reload.deleted?).to be(false)
        expect(rich_content_product.reload.rich_contents.count).to eq(6)
        expect(rich_content_product.alive_rich_contents.count).to eq(4)
        new_rich_content = rich_content_product.alive_rich_contents.second_to_last
        expect(new_rich_content.description).to eq(new_rich_content_description)
        expect(rich_content_product.alive_rich_contents.sort_by(&:position).pluck(:title, :position)).to eq([["Intro", 0], ["Page 1", 1], ["Page 2", 2], ["Page 3", 3]])

        expect do
          patch :update, params: { product_id: rich_content_product.unique_permalink, product: { rich_content: [] } }, as: :json
        end.to change { rich_content_product.reload.alive_rich_contents.count }.from(4).to(0)
          .and change { rich_content_product.rich_contents.count }.by(0)
      end
    end

    describe "product_files_archive generation" do
      it "deletes all product-level archives when switching to variant-level archives" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]
        folder1_id = SecureRandom.uuid
        description = [
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder1_id }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
          ] }
        ]
        files = [
          { id: file1.external_id, url: file1.url },
          { id: file2.external_id, url: file2.url }
        ]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ title: "Page 1", description: { type: "doc", content: description } }],
              files:,
            },
          }, as: :json
        end.to change { product.product_files_archives.alive.count }.by(1)
        archives = product.product_files_archives.alive.to_a
        archives.each do |archive|
          archive.mark_in_progress!
          archive.mark_ready!
        end

        # Do not delete/create any archives if no new changes have been made
        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [
                {
                  id: product.alive_rich_contents.find_by(position: 0).external_id,
                  title: "Page 1",
                  description: { type: "doc", content: description, },
                }
              ],
              files:,
            },
          }, as: :json
        end.to_not change { ProductFilesArchive.count }
        expect(archives.all?(&:alive?)).to eq(true)

        # Create variants first; variant-level content editing requires variants to be saved from the product tab
        variant_category = create(:variant_category, link: product, title: "Versions")
        variant = create(:variant, variant_category: variant_category, name: "Version 1")

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              has_same_rich_content_for_all_variants: false,
              variants: [
                {
                  id: variant.external_id,
                  rich_content: [
                    {
                      title: "Version 1 - Page 1",
                      description: { type: "doc", content: description, }
                    }
                  ],
                }
              ],
              files:,
            },
          }, as: :json
        end.to change { ProductFilesArchive.where.not(variant_id: nil).alive.count }.by(1)
          .and change { product.product_files_archives.alive.count }.by(-1)
      end

      it "deletes all variant-level archives when switching to product-level archives" do
        category = create(:variant_category, link: product, title: "Versions")
        version1 = create(:variant, variant_category: category, name: "Version 1")

        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]
        version1.product_files = [file1, file2]
        version1_rich_content_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => SecureRandom.uuid }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              has_same_rich_content_for_all_variants: false,
              files: [{ id: file1.external_id, url: file1.url }, { id: file2.external_id, url: file2.url }],
              variants: [{ id: version1.external_id, name: version1.name, rich_content: [{ id: nil, title: "Version 1 - Page 1", description: { type: "doc", content: version1_rich_content_description } }] }],
            },
          }, as: :json
        end.to change { version1.product_files_archives.alive.count }.by(1)
          .and change { product.product_files_archives.alive.count }.by(0)

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              has_same_rich_content_for_all_variants: true,
              rich_content: [{ id: nil, title: "Version 1 - Page 1", description: { type: "doc", content: version1_rich_content_description } }],
              files: [{ id: file1.external_id, url: file1.url }, { id: file2.external_id, url: file2.url }],
              variants: [{ id: version1.external_id, name: version1.name }],
            },
          }, as: :json
        end.to change { version1.product_files_archives.alive.count }.by(-1)
          .and change { product.product_files_archives.alive.count }.by(1)
      end

      it "does not generate a folder archive when nothing has changed" do
        expect do
          patch :update, params: { product_id: product.unique_permalink, product: { name: product.name } }, as: :json
        end.to change { product.product_files_archives.folder_archives.alive.count }.by(0)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(0)
      end

      it "does not generate a folder archive when there are no folders" do
        file1 = create(:product_file, display_name: "File 1")
        product.product_files = [file1]
        description = [{ "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => "file1" } }]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
              files: [{ id: file1.external_id, url: file1.url }],
            },
          }, as: :json
        end.to_not change { product.product_files_archives.folder_archives.alive.count }
      end

      it "does not generate a folder archive when a folder only contains 1 file" do
        file1 = create(:product_file, display_name: "File 1")
        product.product_files = [file1]
        description = [
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "", "uid" => SecureRandom.uuid }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          ] },
        ]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
              files: [{ id: file1.external_id, url: file1.url }],
            },
          }, as: :json
        end.to_not change { product.product_files_archives.folder_archives.alive.count }
      end

      it "does not generate an updated folder archive when the product name or page name is changed" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]

        folder1_id = SecureRandom.uuid
        folder1 = { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder1_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: [folder1] } }],
            files: [{ id: file1.external_id, url: file1.url }, { id: file2.external_id, url: file2.url }],
          },
        }, as: :json

        folder1_archive = product.product_files_archives.folder_archives.alive.find_by(folder_id: folder1_id)
        folder1_archive.mark_in_progress!
        folder1_archive.mark_ready!

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "New page title", description: { type: "doc", content: [folder1] } }],
              files: [{ id: file1.external_id, url: file1.url }, { id: file2.external_id, url: file2.url }],
            },
          }, as: :json
        end.to_not change { product.product_files_archives.folder_archives.alive.count }
        expect(folder1_archive.reload.alive?).to eq(true)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(1)
        expect(product.alive_rich_contents.first["title"]).to eq("New page title")
      end

      it "does not generate an updated folder archive when top-level files are modified" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        file3 = create(:product_file, display_name: "File 2")
        file4 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2, file3, file4]
        folder1_id = SecureRandom.uuid
        page1_description = [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => "file1" } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => "file2" } },
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder1_id }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
          ] },
        ]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: page1_description } }],
              files: [file1, file2, file3, file4].map { { id: _1.external_id, url: _1.url } },
            },
          }, as: :json
        end.to change { product.product_files_archives.folder_archives.alive.count }.by(1)

        folder1_archive = product.product_files_archives.folder_archives.alive.find_by(folder_id: folder1_id)
        folder1_archive.mark_in_progress!
        folder1_archive.mark_ready!

        file2.update!(display_name: "New file name")
        file5 = create(:product_file, display_name: "File 3")
        product.product_files << file5
        updated_description = [
          { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => "file2" } },
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder1_id }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
          ] },
          { "type" => "fileEmbed", "attrs" => { "id" => file5.external_id, "uid" => "file5" } },
        ]
        page1 = product.alive_rich_contents.find_by(position: 0)

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: updated_description } }],
              files: [file2, file3, file4, file5].map { { id: _1.external_id, url: _1.url } },
            },
          }, as: :json
        end.to_not change { product.product_files_archives.folder_archives.alive.count }
        expect(folder1_archive.reload.alive?).to eq(true)

        new_description = product.alive_rich_contents.first.description

        expect(new_description.any? { |node| node.dig("attrs", "id") == file1.external_id }).to eq(false)
        expect(new_description.any? { |node| node.dig("attrs", "id") == file2.external_id }).to eq(true)
        expect(new_description.any? { |node| node.dig("attrs", "id") == file5.external_id }).to eq(true)
      end

      it "generates a folder archive for every valid folder on a page" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        file3 = create(:product_file, display_name: "File 3")
        file4 = create(:product_file, display_name: "File 4")
        file5 = create(:product_file, display_name: "File 5")
        file6 = create(:product_file, display_name: "File 6")
        product.product_files = [file1, file2, file3, file4, file5, file6]
        folder1_id = SecureRandom.uuid
        folder2_id = SecureRandom.uuid
        folder3_id = SecureRandom.uuid
        description = [
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder1_id }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
          ] },
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 2", "uid" => folder2_id }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
          ] },
          { "type" => "fileEmbedGroup", "attrs" => { "name" => "", "uid" => folder3_id }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file5.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file6.external_id, "uid" => SecureRandom.uuid } },
          ] },
        ]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
              files: [file1, file2, file3, file4, file5, file6].map { { id: _1.external_id, url: _1.url } },
            },
          }, as: :json
        end.to change { product.product_files_archives.folder_archives.alive.count }.by(3)

        folder1_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: folder1_id)
        folder1_archive.mark_in_progress!
        folder1_archive.mark_ready!
        expect(folder1_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder1_id}/folder 1/#{file1.external_id}/File 1", "#{folder1_id}/folder 1/#{file2.external_id}/File 2"].sort.join("\n")))
        expect(folder1_archive.url.split("/").last).to eq("folder_1.zip")

        folder2_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: folder2_id)
        folder2_archive.mark_in_progress!
        folder2_archive.mark_ready!
        expect(folder2_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder2_id}/folder 2/#{file3.external_id}/File 3", "#{folder2_id}/folder 2/#{file4.external_id}/File 4"].sort.join("\n")))
        expect(folder2_archive.url.split("/").last).to eq("folder_2.zip")

        folder3_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: folder3_id)
        folder3_archive.mark_in_progress!
        folder3_archive.mark_ready!
        expect(folder3_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder3_id}/Untitled 1/#{file5.external_id}/File 5", "#{folder3_id}/Untitled 1/#{file6.external_id}/File 6"].sort.join("\n")))
        expect(folder3_archive.url.split("/").last).to eq("Untitled.zip")

        page1 = product.alive_rich_contents.find_by(position: 0)
        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: page1.description } }],
              files: [file1, file2, file3, file4, file5, file6].map { { id: _1.external_id, url: _1.url } },
            },
          }, as: :json
        end.to_not change { product.product_files_archives.folder_archives.count }

        expect([folder1_archive.reload, folder2_archive.reload, folder3_archive.reload].all?(&:alive?)).to eq(true)
      end

      it "generates a folder archive when a folder is added to an existing page" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]
        folder1_id = SecureRandom.uuid
        folder1 = { "type" => "fileEmbedGroup", "attrs" => { "name" => "", "uid" => folder1_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: [folder1] } }],
              files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
            },
          }, as: :json
        end.to change { product.product_files_archives.folder_archives.alive.count }.by(1)
        archive = product.product_files_archives.folder_archives.alive.last
        archive.mark_in_progress!
        archive.mark_ready!
        expect(archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder1_id}/Untitled 1/#{file1.external_id}/File 1", "#{folder1_id}/Untitled 1/#{file2.external_id}/File 2"].sort.join("\n")))
        expect(archive.url.split("/").last).to eq("Untitled.zip")

        folder2_id = SecureRandom.uuid

        page1 = product.alive_rich_contents.find_by(position: 0)
        file3_id = SecureRandom.uuid
        file4_id = SecureRandom.uuid
        updated_page1_description = [folder1,
                                     { "type" => "fileEmbedGroup", "attrs" => { "name" => "Folder 2", "uid" => folder2_id }, "content" => [
                                       { "type" => "fileEmbed", "attrs" => { "id" => file3_id, "uid" => SecureRandom.uuid } },
                                       { "type" => "fileEmbed", "attrs" => { "id" => file4_id, "uid" => SecureRandom.uuid } },
                                     ] },
        ]
        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: updated_page1_description } }],
              files: [{ id: file1.external_id, url: file1.url }, { id: file2.external_id, url: file2.url }, { id: file3_id, display_name: "File 3", url: create(:product_file, display_name: "File 3").url }, { id: file4_id, display_name: "File 4", url: create(:product_file, display_name: "File 4").url }],
            },
          }, as: :json
        end.to change { product.product_files_archives.folder_archives.alive.count }.by(1)
        expect(archive.needs_updating?(product.product_files)).to be(false)
        expect(archive.reload.alive?).to eq(true)
        expect(product.product_files_archives.folder_archives.alive.count).to be(2)

        new_archive = Link.find(product.id).product_files_archives.folder_archives.alive.last
        new_archive.mark_in_progress!
        new_archive.mark_ready!

        file3 = product.product_files.find_by(display_name: "File 3")
        file4 = product.product_files.find_by(display_name: "File 4")
        expect(new_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder2_id}/Folder 2/#{file3.external_id}/File 3", "#{folder2_id}/Folder 2/#{file4.external_id}/File 4"].sort.join("\n")))
        expect(new_archive.url.split("/").last).to eq("Folder_2.zip")
      end

      it "generates a new folder archive and deletes the old archive for an existing folder that gets modified" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]
        folder1_id = SecureRandom.uuid
        folder1_name = "folder 1"
        folder1 = { "type" => "fileEmbedGroup", "attrs" => { "name" => folder1_name, "uid" => folder1_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }
        description = [folder1]

        expect do
          patch :update, params: {
            product_id: product.unique_permalink,
            product: {
              rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
              files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
            },
          }, as: :json
        end.to change { product.product_files_archives.folder_archives.alive.count }.by(1)

        old_archive = product.product_files_archives.folder_archives.alive.last
        old_archive.mark_in_progress!
        old_archive.mark_ready!

        expect(old_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder1_id}/#{folder1_name}/#{file1.external_id}/File 1", "#{folder1_id}/#{folder1_name}/#{file2.external_id}/File 2"].sort.join("\n")))
        expect(old_archive.url.split("/").last).to eq("folder_1.zip")

        folder1_name = "New folder name"
        folder1["attrs"]["name"] = folder1_name
        page1 = product.alive_rich_contents.find_by(position: 0)

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: description } }],
            files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json

        expect(old_archive.reload.alive?).to eq(false)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(1)

        new_archive = Link.find(product.id).product_files_archives.folder_archives.alive.last
        new_archive.mark_in_progress!
        new_archive.mark_ready!

        expect(new_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder1_id}/#{folder1_name}/#{file1.external_id}/File 1", "#{folder1_id}/#{folder1_name}/#{file2.external_id}/File 2"].sort.join("\n")))
        expect(new_archive.url.split("/").last).to eq("New_folder_name.zip")
      end

      it "generates new folder archives when a file is moved from one folder to another folder" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        file3 = create(:product_file, display_name: "File 3")
        file4 = create(:product_file, display_name: "File 4")
        file5 = create(:product_file, display_name: "File 5")
        product.product_files = [file1, file2, file3, file4, file5]

        folder1 = { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => SecureRandom.uuid }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }
        folder2 = { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 2", "uid" => SecureRandom.uuid }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file5.external_id, "uid" => SecureRandom.uuid } },
        ] }
        description = [folder1, folder2]

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
            files: [file1, file2, file3, file4, file5].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json

        folder1_archive = product.product_files_archives.create!(folder_id: folder1.dig("attrs", "uid"))
        folder1_archive.product_files = product.product_files
        folder1_archive.mark_in_progress!
        folder1_archive.mark_ready!

        folder2_archive = product.product_files_archives.create!(folder_id: folder2.dig("attrs", "uid"))
        folder2_archive.product_files = product.product_files
        folder2_archive.mark_in_progress!
        folder2_archive.mark_ready!

        new_folder1 = { "type" => "fileEmbedGroup", "attrs" => { "name" => folder1.dig("attrs", "name"), "uid" => folder1.dig("attrs", "uid") }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
        ] }
        new_folder2 = { "type" => "fileEmbedGroup", "attrs" => { "name" => folder2.dig("attrs", "name"), "uid" => folder2.dig("attrs", "uid") }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file5.external_id, "uid" => SecureRandom.uuid } },
        ] }
        new_description = [new_folder1, new_folder2]
        page1 = product.alive_rich_contents.find_by(position: 0)

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: new_description } }],
            files: [file1, file2, file3, file4, file5].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json

        expect(folder1_archive.reload.alive?).to eq(false)
        expect(folder2_archive.reload.alive?).to eq(false)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(2)

        new_folder1_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: new_folder1.dig("attrs", "uid"))
        new_folder1_archive.mark_in_progress!
        new_folder1_archive.mark_ready!

        new_folder2_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: new_folder2.dig("attrs", "uid"))
        new_folder2_archive.mark_in_progress!
        new_folder2_archive.mark_ready!

        expect(new_folder1_archive.digest).to eq(Digest::SHA1.hexdigest(["#{new_folder1.dig("attrs", "uid")}/#{new_folder1.dig("attrs", "name")}/#{file1.external_id}/File 1", "#{new_folder1.dig("attrs", "uid")}/#{new_folder1.dig("attrs", "name")}/#{file2.external_id}/File 2", "#{new_folder1.dig("attrs", "uid")}/#{new_folder1.dig("attrs", "name")}/#{file3.external_id}/File 3"].sort.join("\n")))
        expect(new_folder2_archive.digest).to eq(Digest::SHA1.hexdigest(["#{new_folder2.dig("attrs", "uid")}/#{new_folder2.dig("attrs", "name")}/#{file4.external_id}/File 4", "#{new_folder2.dig("attrs", "uid")}/#{new_folder2.dig("attrs", "name")}/#{file5.external_id}/File 5"].sort.join("\n")))
      end

      it "deletes the corresponding folder archive when a folder gets deleted" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]
        folder_id = SecureRandom.uuid
        description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
            files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json
        expect(product.product_files_archives.folder_archives.alive.count).to eq(1)

        old_archive = product.product_files_archives.folder_archives.alive.find_by(folder_id:)
        old_archive.mark_in_progress!
        old_archive.mark_ready!

        new_description = [{ "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Hello" }] }]
        page1 = product.alive_rich_contents.find_by(position: 0)

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: new_description } }],
            files: [],
          },
        }, as: :json

        expect(old_archive.reload.alive?).to eq(false)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(0)
      end

      it "deletes a folder archive if the folder is updated to contain only 1 file" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        product.product_files = [file1, file2]
        folder_id = SecureRandom.uuid
        description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: description } }],
            files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json
        expect(product.product_files_archives.folder_archives.alive.count).to eq(1)

        old_archive = product.product_files_archives.folder_archives.alive.find_by(folder_id:)
        old_archive.product_files = product.product_files
        old_archive.mark_in_progress!
        old_archive.mark_ready!

        new_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => folder_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }]
        page1 = product.alive_rich_contents.find_by(position: 0)

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: new_description } }],
            files: [{ id: file1.external_id, url: file1.url }],
          },
        }, as: :json

        expect(old_archive.reload.alive?).to eq(false)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(0)
      end

      it "updates all folder archives when multiple changes occur to a product's rich content across multiple pages" do
        file1 = create(:product_file, display_name: "File 1")
        file2 = create(:product_file, display_name: "File 2")
        file3 = create(:product_file, display_name: "File 3")
        file4 = create(:product_file, display_name: "File 4")
        product.product_files = [file1, file2, file3, file4]

        folder1_id = SecureRandom.uuid
        folder1_name = "folder 1"
        page1_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => folder1_name, "uid" => folder1_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        folder2_id = SecureRandom.uuid
        folder2_name = "SECOND folder"
        page2_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => folder2_name, "uid" => folder2_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: page1_description } }, { id: nil, title: "Page 2", description: { type: "doc", content: page2_description } }],
            files: [file1, file2, file3, file4].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json

        folder1_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: folder1_id)
        folder1_archive.mark_in_progress!
        folder1_archive.mark_ready!

        folder2_archive = product.product_files_archives.folder_archives.alive.find_by(folder_id: folder2_id)
        folder2_archive.mark_in_progress!
        folder2_archive.mark_ready!

        updated_page1_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => folder1_name, "uid" => folder1_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        file5 = create(:product_file, display_name: "File 5")
        product.product_files << file5
        updated_page2_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => folder2_name, "uid" => folder2_id }, "content" => [
          { "type" => "fileEmbed", "attrs" => { "id" => file3.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file4.external_id, "uid" => SecureRandom.uuid } },
          { "type" => "fileEmbed", "attrs" => { "id" => file5.external_id, "uid" => SecureRandom.uuid } },
        ] }]

        updated_page1_description << { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "Ignore me" }] }
        updated_page2_description << { "type" => "paragraph", "content" => [{ "type" => "text", "text" => "A paragraph" }] }

        page1 = product.alive_rich_contents.find_by(position: 0)
        page2 = product.alive_rich_contents.find_by(position: 1)

        patch :update, params: {
          product_id: product.unique_permalink,
          product: {
            rich_content: [{ id: page1.external_id, title: page1.title, description: { type: "doc", content: updated_page1_description } }, { id: page2.external_id, title: page2.title, description: { type: "doc", content: updated_page2_description } }],
            files: [file1, file3, file4, file5].map { { id: _1.external_id, url: _1.url } },
          },
        }, as: :json

        expect(folder1_archive.reload.alive?).to eq(false)
        expect(folder2_archive.reload.alive?).to eq(false)
        expect(product.product_files_archives.folder_archives.alive.count).to eq(1)
        expect(product.product_files_archives.folder_archives.alive.find_by(folder_id: folder1_id)).to be_nil

        new_folder2_archive = Link.find(product.id).product_files_archives.folder_archives.alive.find_by(folder_id: folder2_id)
        new_folder2_archive.mark_in_progress!
        new_folder2_archive.mark_ready!
        expect(new_folder2_archive.digest).to eq(Digest::SHA1.hexdigest(["#{folder2_id}/#{folder2_name}/#{file3.external_id}/File 3", "#{folder2_id}/#{folder2_name}/#{file4.external_id}/File 4", "#{folder2_id}/#{folder2_name}/#{file5.external_id}/File 5"].sort.join("\n")))
      end

      context "product variants" do
        it "generates folder archives for a new variant when has_same_rich_content_for_all_variants is false" do
          category = create(:variant_category, link: product, title: "Versions")
          version1 = create(:variant, variant_category: category, name: "Version 1")

          file1 = create(:product_file, display_name: "File 1")
          file2 = create(:product_file, display_name: "File 2")
          product.product_files = [file1, file2]
          version1.product_files = [file1, file2]
          version1_rich_content_description = [{ "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => SecureRandom.uuid }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
          ] }]

          expect do
            patch :update, params: {
              product_id: product.unique_permalink,
              product: {
                has_same_rich_content_for_all_variants: false,
                files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
                variants: [{ id: version1.external_id, name: version1.name, rich_content: [{ id: nil, title: "Version 1 - Page 1", description: { type: "doc", content: version1_rich_content_description } }] }],
              },
            }, as: :json
          end.to change { version1.product_files_archives.folder_archives.alive.count }.by(1)
              .and change { product.product_files_archives.folder_archives.alive.count }.by(0)
        end

        it "generates folder archives for the file embed groups in product-level content when has_same_rich_content_for_all_variants is true" do
          file1 = create(:product_file, display_name: "File 1")
          file2 = create(:product_file, display_name: "File 2")
          product.product_files = [file1, file2]
          variant_category = create(:variant_category, title: "versions", link: product)
          variant = create(:variant, variant_category:, name: "mac")
          variant.product_files = [file1, file2]

          folder1 = { "type" => "fileEmbedGroup", "attrs" => { "name" => "folder 1", "uid" => SecureRandom.uuid }, "content" => [
            { "type" => "fileEmbed", "attrs" => { "id" => file1.external_id, "uid" => SecureRandom.uuid } },
            { "type" => "fileEmbed", "attrs" => { "id" => file2.external_id, "uid" => SecureRandom.uuid } },
          ] }

          expect do
            patch :update, params: {
              product_id: product.unique_permalink,
              product: {
                has_same_rich_content_for_all_variants: true,
                rich_content: [{ id: nil, title: "Page 1", description: { type: "doc", content: [folder1] } }],
                variants: [{ "id" => variant.external_id, "name" => "linux", "price" => "2" }],
                files: [file1, file2].map { { id: _1.external_id, url: _1.url } },
              },
            }, as: :json
          end.to change { variant.product_files_archives.folder_archives.alive.count }.by(0)
            .and change { product.product_files_archives.folder_archives.alive.count }.by(1)
        end
      end
    end

    describe "file validation errors" do
      it "returns error when ISBN is invalid" do
        product_file = product.product_files.first
        patch :update, params: @params.deep_merge(product: {
                                                    files: [{
                                                      id: product_file.external_id,
                                                      url: product_file.url,
                                                      display_name: "Test File",
                                                      description: "Test Description",
                                                      isbn: "invalid isbn",
                                                    }],
                                                  }), as: :json

        expect(response).to have_http_status(:found)
        expect(response).to redirect_to(edit_product_content_path(product.unique_permalink))

        get :edit, params: { product_id: product.unique_permalink }, as: :json

        expect(response).to be_successful
        expect(inertia.props.deep_symbolize_keys[:errors]).to include(
          "product.base": "Validation failed: Isbn is not a valid ISBN-10 or ISBN-13",
        )
      end
    end
  end
end
