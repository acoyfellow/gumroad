import { useForm } from "@inertiajs/react";
import * as React from "react";

import ProductEditLayout from "$app/layouts/ProductEditLayout";
import { CurrencyCode } from "$app/utils/currency";

import { Layout } from "$app/components/ProductEdit/Layout";
import { ReceiptPreview } from "$app/components/ProductEdit/ReceiptPreview";
import { ReceiptTab } from "$app/components/ProductEdit/ReceiptTab";
import {
  useProductEditContext,
  ProductFormContext,
  ProductFormState,
  ContentUpdates,
} from "$app/components/ProductEdit/state";

type ReceiptFormData = {
  name: string;
  custom_permalink: string | null;
  custom_receipt_text: string | null;
  custom_view_content_button_text: string | null;
};

function ReceiptPage() {
  const { product: initialProduct, uniquePermalink, currencyType: initialCurrencyType } = useProductEditContext();
  const updateUrl = Routes.product_receipt_path(uniquePermalink);

  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(initialCurrencyType);
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);

  const form = useForm<ReceiptFormData>({
    name: initialProduct.name,
    custom_permalink: initialProduct.custom_permalink,
    custom_receipt_text: initialProduct.custom_receipt_text,
    custom_view_content_button_text: initialProduct.custom_view_content_button_text,
  });

  const product: ProductFormState = React.useMemo(
    () => ({
      ...initialProduct,
      ...form.data,
    }),
    [initialProduct, form.data],
  );

  const formContextValue = React.useMemo(
    () => ({
      product,
      updateProduct: () => {},
      currencyType,
      setCurrencyType,
      contentUpdates,
      setContentUpdates,
    }),
    [product, currencyType, contentUpdates],
  );

  const submitForm = (
    additionalData: Record<string, unknown> = {},
    options?: { onStart?: () => void; onSuccess?: () => void; onFinish?: () => void },
  ) => {
    if (form.processing) return;
    form.transform((data) => ({ product: data, ...additionalData }));
    form.patch(updateUrl, {
      preserveScroll: true,
      ...options,
      onSuccess: () => {
        form.setDefaults();
        options?.onSuccess?.();
      },
    });
  };

  const [isPublishing, setIsPublishing] = React.useState(false);

  const submitFormAndPublish = () => {
    submitForm(
      { publish: true },
      {
        onStart: () => setIsPublishing(true),
        onFinish: () => setIsPublishing(false),
      },
    );
  };

  const [isUnpublishing, setIsUnpublishing] = React.useState(false);

  const submitFormAndUnpublish = () => {
    submitForm(
      { unpublish: true },
      {
        onStart: () => setIsUnpublishing(true),
        onFinish: () => setIsUnpublishing(false),
      },
    );
  };

  const saveBeforeNavigate = (targetPath: string) => {
    if (!form.isDirty) return false;
    submitForm({ redirect_to: targetPath });
    return true;
  };

  return (
    <ProductFormContext.Provider value={formContextValue}>
      <Layout
        name={product.name}
        preview={
          <ReceiptPreview
            customReceiptText={form.data.custom_receipt_text}
            customViewContentButtonText={form.data.custom_view_content_button_text}
          />
        }
        previewScaleFactor={1}
        showBorder={false}
        isSaving={form.processing}
        isPublishing={isPublishing}
        isUnpublishing={isUnpublishing}
        isDirty={form.isDirty}
        onSave={() => submitForm()}
        onPublish={() => submitFormAndPublish()}
        onUnpublish={() => submitFormAndUnpublish()}
        onBeforeNavigate={saveBeforeNavigate}
      >
        <ReceiptTab
          customViewContentButtonText={form.data.custom_view_content_button_text}
          customReceiptText={form.data.custom_receipt_text}
          customViewContentButtonTextMaxLength={product.custom_view_content_button_text_max_length}
          customReceiptTextMaxLength={product.custom_receipt_text_max_length}
          onCustomViewContentButtonTextChange={(value) => form.setData("custom_view_content_button_text", value)}
          onCustomReceiptTextChange={(value) => form.setData("custom_receipt_text", value)}
        />
      </Layout>
    </ProductFormContext.Provider>
  );
}

ReceiptPage.layout = (page: React.ReactNode) => <ProductEditLayout>{page}</ProductEditLayout>;

export default ReceiptPage;
