import { useForm } from "@inertiajs/react";
import * as React from "react";

import ProductEditLayout from "$app/layouts/ProductEditLayout";
import { CurrencyCode } from "$app/utils/currency";

import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { ShareTab } from "$app/components/ProductEdit/ShareTab";
import {
  useProductEditContext,
  ProductFormContext,
  type Product,
  type ContentUpdates,
} from "$app/components/ProductEdit/state";

type ShareFormData = {
  name: string;
  custom_permalink: string | null;
  section_ids: string[];
  taxonomy_id: string | null;
  tags: string[];
  display_product_reviews: boolean;
  is_adult: boolean;
};

function SharePage() {
  const { product, uniquePermalink, currencyType: initialCurrencyType } = useProductEditContext();
  const url = useProductUrl();
  const updateUrl = Routes.product_share_path(uniquePermalink);

  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(initialCurrencyType);
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);

  const form = useForm<ShareFormData>({
    name: product.name,
    custom_permalink: product.custom_permalink,
    section_ids: product.section_ids,
    taxonomy_id: product.taxonomy_id,
    tags: product.tags,
    display_product_reviews: product.display_product_reviews,
    is_adult: product.is_adult,
  });

  const updateProduct = React.useCallback(
    (update: Partial<Product> | ((product: Product) => void)) => {
      if (typeof update === "function") {
        // Share page doesn't need complex updates
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

  const saveBeforeNavigate = (targetPath: string) => {
    if (!form.isDirty) return false;
    submitForm({ redirect_to: targetPath });
    return true;
  };

  const submitFormAndPreview = () => {
    submitForm(
      {},
      {
        onSuccess: () => window.open(url, "_blank"),
      },
    );
  };

  return (
    <ProductFormContext.Provider value={formContextValue}>
      <Layout
        name={product.name}
        preview={<ProductPreview />}
        isSaving={form.processing}
        isPublishing={isPublishing}
        isUnpublishing={isUnpublishing}
        isDirty={form.isDirty}
        onSave={() => submitForm()}
        onPublish={() => submitFormAndPublish()}
        onUnpublish={() => submitFormAndUnpublish()}
        onPreview={() => submitFormAndPreview()}
        onBeforeNavigate={saveBeforeNavigate}
      >
        <ShareTab
          sectionIds={form.data.section_ids}
          taxonomyId={form.data.taxonomy_id}
          tags={form.data.tags}
          displayProductReviews={form.data.display_product_reviews}
          isAdult={form.data.is_adult}
          onSectionIdsChange={(sectionIds) => form.setData("section_ids", sectionIds)}
          onTaxonomyIdChange={(taxonomyId) => form.setData("taxonomy_id", taxonomyId)}
          onTagsChange={(tags) => form.setData("tags", tags)}
          onDisplayProductReviewsChange={(value) => form.setData("display_product_reviews", value)}
          onIsAdultChange={(value) => form.setData("is_adult", value)}
        />
      </Layout>
    </ProductFormContext.Provider>
  );
}

SharePage.layout = (page: React.ReactNode) => <ProductEditLayout>{page}</ProductEditLayout>;

export default SharePage;
