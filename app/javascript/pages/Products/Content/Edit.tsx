import { useForm } from "@inertiajs/react";
import { isEqual } from "lodash-es";
import * as React from "react";

import ProductEditLayout from "$app/layouts/ProductEditLayout";
import { CurrencyCode } from "$app/utils/currency";

import { ContentTab, ContentTabHeaderActions } from "$app/components/ProductEdit/ContentTab";
import { Page } from "$app/components/ProductEdit/ContentTab/PageTab";
import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import {
  useProductEditContext,
  ProductFormContext,
  ProductFormState,
  ContentUpdates,
  produceProductForm,
} from "$app/components/ProductEdit/state";

const pagesHaveSameContent = (pages1: Page[], pages2: Page[]): boolean => isEqual(pages1, pages2);

const findUpdatedContent = (product: ProductFormState, lastSavedProduct: ProductFormState) => {
  const contentUpdatedVariantIds = product.variants
    .filter((variant) => {
      const lastSavedVariant = lastSavedProduct.variants.find((v) => v.id === variant.id);
      return !pagesHaveSameContent(variant.rich_content, lastSavedVariant?.rich_content ?? []);
    })
    .map((variant) => variant.id);

  const sharedContentUpdated = !pagesHaveSameContent(product.rich_content, lastSavedProduct.rich_content);

  return {
    sharedContentUpdated,
    contentUpdatedVariantIds,
  };
};

function ContentPage() {
  const { product: initialProduct, uniquePermalink, currencyType: initialCurrencyType, successfulSalesCount } =
    useProductEditContext();
  const url = useProductUrl();
  const updateUrl = Routes.product_content_path(uniquePermalink);

  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(initialCurrencyType);
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);
  const lastSavedProductRef = React.useRef<ProductFormState>(structuredClone(initialProduct));

  const form = useForm<ProductFormState>(initialProduct);

  // Initialize selectedVariantId to the first variant when product has per-variant content
  React.useLayoutEffect(() => {
    if (
      !form.data.has_same_rich_content_for_all_variants &&
      selectedVariantId === null &&
      form.data.variants.length > 0
    ) {
      setSelectedVariantId(form.data.variants[0]?.id ?? null);
    }
  }, [form.data.has_same_rich_content_for_all_variants, selectedVariantId, form.data.variants]);

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
    const productBeforeSave = structuredClone(product);
    form.transform((data) => ({ product: data, ...additionalData }));
    form.patch(updateUrl, {
      preserveScroll: true,
      ...options,
      onSuccess: () => {
        // Check if content was updated and we should prompt for notification
        const { contentUpdatedVariantIds, sharedContentUpdated } = findUpdatedContent(
          productBeforeSave,
          lastSavedProductRef.current,
        );
        const contentUpdated = sharedContentUpdated || contentUpdatedVariantIds.length > 0;

        if (successfulSalesCount > 0 && contentUpdated) {
          const uniquePermalinkOrVariantIds = productBeforeSave.has_same_rich_content_for_all_variants
            ? [uniquePermalink]
            : contentUpdatedVariantIds;

          setContentUpdates({
            uniquePermalinkOrVariantIds,
          });
        }

        // Update the last saved product ref
        lastSavedProductRef.current = structuredClone(productBeforeSave);

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

  const [confirmingDiscardVariantContent, setConfirmingDiscardVariantContent] = React.useState(false);

  return (
    <ProductFormContext.Provider value={formContextValue}>
      <Layout
        name={product.name}
        headerActions={
          <ContentTabHeaderActions
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            setConfirmingDiscardVariantContent={setConfirmingDiscardVariantContent}
          />
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
        <ContentTab
          selectedVariantId={selectedVariantId}
          prepareDownload={prepareDownload}
          confirmingDiscardVariantContent={confirmingDiscardVariantContent}
          setConfirmingDiscardVariantContent={setConfirmingDiscardVariantContent}
        />
      </Layout>
    </ProductFormContext.Provider>
  );
}

ContentPage.layout = (page: React.ReactNode) => <ProductEditLayout>{page}</ProductEditLayout>;

export default ContentPage;
