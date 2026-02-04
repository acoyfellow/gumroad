import { useForm } from "@inertiajs/react";
import { produce } from "immer";
import * as React from "react";

import ProductEditLayout from "$app/layouts/ProductEditLayout";
import { CurrencyCode } from "$app/utils/currency";

import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { ProductTab } from "$app/components/ProductEdit/ProductTab";
import { useImageUpload } from "$app/components/ProductEdit/ProductTab/DescriptionEditor";
import { useProductEditContext, ProductFormContext, Product, ContentUpdates } from "$app/components/ProductEdit/state";

// ProductTab uses almost all product fields, so we include most of them
type ProductFormData = Omit<
  Product,
  | "custom_receipt_text"
  | "custom_receipt_text_max_length"
  | "custom_view_content_button_text"
  | "custom_view_content_button_text_max_length"
>;

function ProductPage() {
  const { product, uniquePermalink, currencyType: initialCurrencyType } = useProductEditContext();
  const { isUploading } = useImageUpload();
  const url = useProductUrl();
  const updateUrl = Routes.product_product_path(uniquePermalink);

  const [showRefundPolicyPreview] = React.useState(false);
  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(initialCurrencyType);
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);

  // Initialize form with product data (excluding receipt-specific fields)
  const form = useForm<ProductFormData>(() => {
    const {
      custom_receipt_text,
      custom_receipt_text_max_length,
      custom_view_content_button_text,
      custom_view_content_button_text_max_length,
      ...productData
    } = product;
    return productData;
  });

  const updateProduct = React.useCallback(
    (update: Partial<Product> | ((product: Product) => void)) => {
      if (typeof update === "function") {
        form.setData((prev) => produce(prev, update));
      } else {
        form.setData((prev) => ({ ...prev, ...update }));
      }
    },
    [form],
  );

  const formContextValue = React.useMemo(
    () => ({
      product,
      updateProduct,
      currencyType,
      setCurrencyType,
      contentUpdates,
      setContentUpdates,
    }),
    [product, updateProduct, currencyType, contentUpdates],
  );

  const submitForm = (
    additionalData: Record<string, unknown> = {},
    options?: { onStart?: () => void; onSuccess?: () => void; onFinish?: () => void },
  ) => {
    if (form.processing) return;
    form.transform((data) => ({ product: { ...data, currency_type: currencyType }, ...additionalData }));
    form.patch(updateUrl, { preserveScroll: true, ...options });
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

  const submitFormAndPreview = () => {
    submitForm(
      {},
      {
        onSuccess: () => window.open(url, "_blank"),
      },
    );
  };

  const saveBeforeNavigate = (targetPath: string) => {
    if (!form.isDirty) return false;
    submitForm({ redirect_to: targetPath });
    return true;
  };

  const isCoffee = product.native_type === "coffee";

  return (
    <ProductFormContext.Provider value={formContextValue}>
      <Layout
        name={product.name}
        preview={<ProductPreview showRefundPolicyModal={showRefundPolicyPreview} />}
        isLoading={isUploading}
        isSaving={form.processing}
        isPublishing={isPublishing}
        isUnpublishing={isUnpublishing}
        isDirty={form.isDirty}
        files={form.data.files}
        publicFiles={form.data.public_files}
        onSave={() => submitForm()}
        onPublish={() => submitFormAndPublish()}
        onUnpublish={() => submitFormAndUnpublish()}
        {...(!isCoffee && {
          onSaveAndContinue: () => submitForm({ redirect_to: Routes.edit_product_content_path(uniquePermalink) }),
        })}
        onPreview={() => submitFormAndPreview()}
        onBeforeNavigate={saveBeforeNavigate}
      >
        <ProductTab />
      </Layout>
    </ProductFormContext.Provider>
  );
}

ProductPage.layout = (page: React.ReactNode) => <ProductEditLayout>{page}</ProductEditLayout>;

export default ProductPage;
