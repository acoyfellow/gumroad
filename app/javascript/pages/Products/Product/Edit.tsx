import { useForm } from "@inertiajs/react";
import * as React from "react";

import ProductEditLayout from "$app/layouts/ProductEditLayout";
import { CurrencyCode } from "$app/utils/currency";

import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { ProductTab } from "$app/components/ProductEdit/ProductTab";
import { useImageUpload } from "$app/components/ProductEdit/ProductTab/DescriptionEditor";
import {
  useProductEditContext,
  ProductFormContext,
  ProductFormState,
  ContentUpdates,
  produceProductForm,
} from "$app/components/ProductEdit/state";

function ProductPage() {
  const { product: initialProduct, uniquePermalink, currencyType: initialCurrencyType } = useProductEditContext();
  const { isUploading } = useImageUpload();
  const url = useProductUrl();
  const updateUrl = Routes.product_product_path(uniquePermalink);

  const [showRefundPolicyPreview] = React.useState(false);
  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(initialCurrencyType);
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);

  const form = useForm<ProductFormState>(initialProduct);

  // Build product object for child components - merging initialProduct with form.data
  const product: ProductFormState = React.useMemo(
    () => ({
      ...initialProduct,
      ...form.data,
    }),
    [initialProduct, form.data],
  );

  const updateProduct = React.useCallback(
    (update: Partial<ProductFormState> | ((product: ProductFormState) => void)) => {
      if (typeof update === "function") {
        form.setData((prev) => produceProductForm(prev, update));
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
    form.transform((data) => ({ product: { ...data, price_currency_type: currencyType }, ...additionalData }));
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
