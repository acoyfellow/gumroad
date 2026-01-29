// DELETE
import * as React from "react";

import { Layout } from "$app/components/ProductEdit/Layout";
import { ReceiptPreview } from "$app/components/ProductEdit/ReceiptPreview";
import { CustomReceiptTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomReceiptTextInput";
import { CustomViewContentButtonTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomViewContentButtonTextInput";
import { useProductEditContext } from "$app/components/ProductEdit/state";

type ReceiptTabProps = {
  product?: any;
  updateProduct?: (data: Partial<any>) => void;
  uniquePermalink?: string;
};

export const ReceiptTab = (props?: ReceiptTabProps) => {
  const contextData = useProductEditContext();
  const product = props?.product || contextData?.product;
  const updateProduct = props?.updateProduct || contextData?.updateProduct;
  const uniquePermalink = props?.uniquePermalink || contextData?.uniquePermalink;

  if (!product || !updateProduct) return null;

  return (
    <Layout
      preview={
        <ReceiptPreview
          uniquePermalink={uniquePermalink || ""}
          custom_receipt_text={product.custom_receipt_text}
          custom_view_content_button_text={product.custom_view_content_button_text}
        />
      }
      previewScaleFactor={1}
      showBorder={false}
      showNavigationButton={false}
    >
      <div className="squished">
        <form>
          <section className="p-4! md:p-8!">
            <CustomViewContentButtonTextInput
              value={product.custom_view_content_button_text}
              onChange={(value) => updateProduct({ custom_view_content_button_text: value })}
              maxLength={product.custom_view_content_button_text_max_length}
            />
            <CustomReceiptTextInput
              value={product.custom_receipt_text}
              onChange={(value) => updateProduct({ custom_receipt_text: value })}
              maxLength={product.custom_receipt_text_max_length}
            />
          </section>
        </form>
      </div>
    </Layout>
  );
};
