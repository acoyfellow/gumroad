# frozen_string_literal: true

class Products::ContentTabPresenter < Products::BasePresenter
  def props
    layout_props.merge(
      existing_files: existing_files_data,
      aws_key: AWS_ACCESS_KEY,
      s3_url: "#{AWS_S3_ENDPOINT}/#{S3_BUCKET}",
      dropbox_app_key: DROPBOX_PICKER_API_KEY,
      product: product_props,
    )
  end

  private
    def product_props
      product_minimal_props.merge(
        id: product.external_id,
        description: product.description || "",
        rich_content: product.rich_content_json,
        variants: variants_data,
        has_same_rich_content_for_all_variants: product.has_same_rich_content_for_all_variants?,
        is_multiseat_license: product.is_multiseat_license,
      )
    end
end
