# frozen_string_literal: true

require "spec_helper"

describe "PUT /links/:id (Update Product)", type: :request do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product_with_pdf_file, user: seller) }

  before do
    sign_in seller
  end

  describe "basic product updates" do
    it "updates product name and description" do
      put "/links/#{product.unique_permalink}", params: {
        name: "Updated Name",
        description: "Updated Description"
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.name).to eq("Updated Name")
      expect(product.reload.description).to eq("Updated Description")
    end

    it "updates custom attributes" do
      put "/links/#{product.unique_permalink}", params: {
        custom_attributes: [
          { name: "color", value: "red" },
          { name: "size", value: "large" }
        ]
      }

      expect(response).to have_http_status(:no_content)
    end

    it "updates custom button text" do
      put "/links/#{product.unique_permalink}", params: {
        custom_button_text_option: "pay_prompt"
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.custom_button_text_option).to eq("pay_prompt")
    end
  end

  describe "pricing updates" do
    it "updates product price" do
      put "/links/#{product.unique_permalink}", params: {
        price_cents: 5000
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.price_cents).to eq(5000)
    end

    it "supports currency type changes" do
      put "/links/#{product.unique_permalink}", params: {
        price_currency_type: "eur"
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.price_currency_type).to eq("eur")
    end
  end

  describe "file management" do
    it "adds files to product" do
      fixture_file_upload("test-small.gif", "image/gif")

      expect do
        put "/links/#{product.unique_permalink}", params: {
          files: [
            {
              id: SecureRandom.uuid,
              url: "https://s3.amazonaws.com/bucket/new-file.pdf"
            }
          ]
        }
      end.to change { product.product_files.count }

      expect(response).to have_http_status(:no_content)
    end

    it "tracks content_updated_at when files are changed" do
      freeze_time do
        put "/links/#{product.unique_permalink}", params: {
          files: [
            {
              id: SecureRandom.uuid,
              url: "https://s3.amazonaws.com/bucket/new-file.pdf"
            }
          ]
        }

        product.reload
        expect(product.content_updated_at).to eq(Time.current)
      end
    end

    it "does not update content_updated_at for metadata changes" do
      freeze_time do
        put "/links/#{product.unique_permalink}", params: {
          description: "new description"
        }

        product.reload
        expect(product.content_updated_at).to be_nil
      end
    end
  end

  describe "rich content updates" do
    it "updates product rich content" do
      put "/links/#{product.unique_permalink}", params: {
        rich_content: [
          {
            id: nil,
            title: "Page 1",
            description: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Hello World" }] }]
            }
          }
        ]
      }

      expect(response).to have_http_status(:no_content)
    end

    it "sets is_licensed when license key is present" do
      put "/links/#{product.unique_permalink}", params: {
        rich_content: [
          {
            id: nil,
            title: "Page",
            description: {
              type: "doc",
              content: [{ type: "licenseKey" }]
            }
          }
        ]
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.is_licensed).to be(true)
    end

    it "clears is_licensed when license key is removed" do
      product.update(is_licensed: true)

      put "/links/#{product.unique_permalink}", params: {
        rich_content: [
          {
            id: nil,
            title: "Page",
            description: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "No license here" }] }]
            }
          }
        ]
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.is_licensed).to be(false)
    end
  end

  describe "refund policy updates" do
    it "enables refund policy" do
      put "/links/#{product.unique_permalink}", params: {
        product_refund_policy_enabled: true,
        refund_policy: {
          max_refund_period_in_days: 7,
          fine_print: "Sample fine print"
        }
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.product_refund_policy_enabled).to be(true)
    end

    it "disables refund policy" do
      put "/links/#{product.unique_permalink}", params: {
        product_refund_policy_enabled: false
      }

      expect(response).to have_http_status(:no_content)
      expect(product.reload.product_refund_policy_enabled).to be(false)
    end
  end

  describe "variants and versions" do
    it "adds variants to product" do
      put "/links/#{product.unique_permalink}", params: {
        variants: [
          { name: "Version 1", price_difference_cents: 0 },
          { name: "Version 2", price_difference_cents: 500 }
        ]
      }

      expect(response).to have_http_status(:no_content)
    end

    it "updates coffee product suggested price based on variants" do
      coffee_product = create(:coffee_product, user: seller)

      put "/links/#{coffee_product.unique_permalink}", params: {
        variants: [
          { price_difference_cents: 300 },
          { price_difference_cents: 500 },
          { price_difference_cents: 100 }
        ]
      }

      expect(response).to have_http_status(:no_content)
      expect(coffee_product.reload.suggested_price_cents).to eq(500)
    end
  end

  describe "custom domains" do
    it "updates custom domain" do
      domain = create(:custom_domain, product: product)

      put "/links/#{product.unique_permalink}", params: {
        custom_domain_attributes: {
          id: domain.external_id,
          domain: "newdomain.com"
        }
      }

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "tags and categories" do
    it "adds tags to product" do
      tag = create(:tag)

      put "/links/#{product.unique_permalink}", params: {
        tag_ids: [tag.external_id]
      }

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "authentication and authorization" do
    it "requires user to be signed in" do
      sign_out seller
      put "/links/#{product.unique_permalink}", params: { name: "Test" }

      expect(response).to redirect_to(new_user_session_path)
    end

    it "prevents other users from updating the product" do
      other_user = create(:user)
      sign_in other_user

      put "/links/#{product.unique_permalink}", params: { name: "Hacked" }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "error handling" do
    it "returns 400 for invalid params" do
      put "/links/#{product.unique_permalink}", params: {
        price_cents: "not-a-number"
      }

      expect(response.status).to be >= 400
    end
  end
end
