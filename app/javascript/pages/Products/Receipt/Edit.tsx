import { useForm, usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { Layout } from "$app/components/ProductEdit/Layout";
import { ReceiptPreview } from "$app/components/ProductEdit/ReceiptPreview";
import { CustomReceiptTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomReceiptTextInput";
import { CustomViewContentButtonTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomViewContentButtonTextInput";
import type { EditProductBase, Product } from "$app/components/ProductEdit/state";

type EditProductReceiptPageProps = {
  product: EditProductBase & Pick<Product, "custom_receipt_text" | "custom_view_content_button_text">;
  receipt_preview_html: string;
  page_metadata: {
    custom_receipt_text_max_length: number;
    custom_view_content_button_text_max_length: number;
  };
};

const EditProductReceiptPage = () => {
  const { product, receipt_preview_html, page_metadata } = cast<EditProductReceiptPageProps>(usePage().props);
  const form = useForm({ product });

  const saveReceiptFields = (
    options?: { onSuccess?: () => void; onFinish?: () => void },
    saveData?: { next_url?: string; publish?: boolean },
  ) => {
    form.transform((data) => ({
      product: {
        custom_receipt_text: data.product.custom_receipt_text,
        custom_view_content_button_text: data.product.custom_view_content_button_text,
        publish: saveData?.publish,
      },
      ...(saveData?.next_url && { next_url: saveData.next_url }),
    }));

    form.patch(Routes.product_receipt_path(product.unique_permalink), {
      only: ["product", "errors", "flash"],
      ...(options?.onSuccess && { onSuccess: options.onSuccess }),
      ...(options?.onFinish && { onFinish: options.onFinish }),
    });
  };

  return (
    <Layout
      product={form.data.product}
      preview={
        <ReceiptPreview
          receipt_preview_html={receipt_preview_html}
          custom_receipt_text={form.data.product.custom_receipt_text}
          custom_view_content_button_text={form.data.product.custom_view_content_button_text}
        />
      }
      previewScaleFactor={1}
      showBorder={false}
      showNavigationButton={false}
      selectedTab="receipt"
      processing={form.processing}
      save={saveReceiptFields}
      isFormDirty={form.isDirty}
    >
      <div className="squished">
        <form>
          <section className="p-4! md:p-8!">
            <CustomViewContentButtonTextInput
              value={form.data.product.custom_view_content_button_text}
              onChange={(value) => form.setData("product.custom_view_content_button_text", value)}
              maxLength={page_metadata.custom_view_content_button_text_max_length}
            />
            <CustomReceiptTextInput
              value={form.data.product.custom_receipt_text}
              onChange={(value) => form.setData("product.custom_receipt_text", value)}
              maxLength={page_metadata.custom_receipt_text_max_length}
            />
          </section>
        </form>
      </div>
    </Layout>
  );
};

export default EditProductReceiptPage;
