import { useForm, usePage } from "@inertiajs/react";
import * as React from "react";

import { Layout } from "$app/components/ProductEdit/Layout";
import { ReceiptPreview } from "$app/components/ProductEdit/ReceiptPreview";
import { CustomViewContentButtonTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomViewContentButtonTextInput";
import { CustomReceiptTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomReceiptTextInput";

type ReceiptPageProps = {
  product: {
    custom_receipt_text: string | null;
    custom_view_content_button_text: string | null;
    custom_receipt_text_max_length: number;
    custom_view_content_button_text_max_length: number;
    name: string;
  };
  id: string;
  unique_permalink: string;
};

export default function ReceiptPage() {
  const props = usePage<ReceiptPageProps>().props;
  const { product } = props;

  const form = useForm({
    custom_receipt_text: product.custom_receipt_text ?? "",
    custom_view_content_button_text: product.custom_view_content_button_text ?? "",
  });

  const handleSave = () => {
    form.patch(`/products/edit/${props.unique_permalink}/receipt`, {
      preserveScroll: true,
    });
  };

  return (
    <Layout
      preview={
        <ReceiptPreview
          uniquePermalink={props.unique_permalink}
          custom_receipt_text={form.data.custom_receipt_text}
          custom_view_content_button_text={form.data.custom_view_content_button_text}
        />
      }
      previewScaleFactor={1}
      showBorder={false}
      showNavigationButton={false}
      currentTab="receipt"
      onSave={handleSave}
      isSaving={form.processing}
    >
      <div className="squished">
        <form>
          <section className="p-4! md:p-8!">
            <CustomViewContentButtonTextInput
              value={form.data.custom_view_content_button_text}
              onChange={(value) => form.setData("custom_view_content_button_text", value)}
              maxLength={product.custom_view_content_button_text_max_length}
            />
            <CustomReceiptTextInput
              value={form.data.custom_receipt_text}
              onChange={(value) => form.setData("custom_receipt_text", value)}
              maxLength={product.custom_receipt_text_max_length}
            />
          </section>
        </form>
      </div>
    </Layout>
  );
}
