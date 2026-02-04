import { useForm } from "@inertiajs/react";
import { produce } from "immer";
import * as React from "react";

import ProductEditLayout from "$app/layouts/ProductEditLayout";
import { CurrencyCode } from "$app/utils/currency";

import { ContentTab, ContentTabHeaderActions } from "$app/components/ProductEdit/ContentTab";
import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import { useProductEditContext, ProductFormContext, Product, ContentUpdates } from "$app/components/ProductEdit/state";

type ContentFormData = {
  name: string;
  custom_permalink: string | null;
  rich_content: Product["rich_content"];
  files: Product["files"];
  has_same_rich_content_for_all_variants: boolean;
  is_multiseat_license: boolean;
  variants: Product["variants"];
  public_files: Product["public_files"];
};

function ContentPage() {
  const { product, uniquePermalink, currencyType: initialCurrencyType } = useProductEditContext();
  const url = useProductUrl();
  const updateUrl = Routes.product_content_path(uniquePermalink);

  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(initialCurrencyType);
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);

  const form = useForm<ContentFormData>({
    name: product.name,
    custom_permalink: product.custom_permalink,
    rich_content: product.rich_content,
    files: product.files,
    has_same_rich_content_for_all_variants: product.has_same_rich_content_for_all_variants,
    is_multiseat_license: product.is_multiseat_license,
    variants: product.variants,
    public_files: product.public_files,
  });

  const updateProduct = React.useCallback(
    (update: Partial<Product> | ((product: Product) => void)) => {
      if (typeof update === "function") {
        form.setData((prev) => ({ ...prev, ...produce(prev, update) }));
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
    form.transform((data) => ({ product: data, ...additionalData }));
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

  const prepareDownload = async () =>
    new Promise<void>((resolve) => {
      form.patch(updateUrl, {
        preserveScroll: true,
        onSuccess: () => resolve(),
        onError: () => resolve(),
      });
    });

  return (
    <ProductFormContext.Provider value={formContextValue}>
      <Layout
        name={product.name}
        headerActions={
          <ContentTabHeaderActions selectedVariantId={selectedVariantId} setSelectedVariantId={setSelectedVariantId} />
        }
        isSaving={form.processing}
        isPublishing={isPublishing}
        isUnpublishing={isUnpublishing}
        isDirty={form.isDirty}
        files={form.data.files}
        publicFiles={form.data.public_files}
        onSave={() => submitForm()}
        onPublish={() => submitFormAndPublish()}
        onUnpublish={() => submitFormAndUnpublish()}
        onPreview={() => submitFormAndPreview()}
        onBeforeNavigate={saveBeforeNavigate}
      >
        <ContentTab selectedVariantId={selectedVariantId} prepareDownload={prepareDownload} />
      </Layout>
    </ProductFormContext.Provider>
  );
}

ContentPage.layout = (page: React.ReactNode) => <ProductEditLayout>{page}</ProductEditLayout>;

export default ContentPage;
