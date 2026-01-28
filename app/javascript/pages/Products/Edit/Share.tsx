import { DirectUpload } from "@rails/activestorage";
import { usePage } from "@inertiajs/react";
import { useForm } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { OtherRefundPolicy } from "$app/data/products/other_refund_policies";
import { Thumbnail } from "$app/data/thumbnails";
import { RatingsWithPercentages } from "$app/parsers/product";
import { CurrencyCode } from "$app/utils/currency";
import { Taxonomy } from "$app/utils/discover";
import { ALLOWED_EXTENSIONS } from "$app/utils/file";
import { assertResponseError, request } from "$app/utils/request";

import { Seller } from "$app/components/Product";
import { ShareTab } from "$app/components/ProductEdit/ShareTab";
import {
  ProductEditContext,
  Product,
  ProfileSection,
  ExistingFileEntry,
  ShippingCountry,
  ContentUpdates,
} from "$app/components/ProductEdit/state";
import { ImageUploadSettingsContext } from "$app/components/RichTextEditor";

type PageProps = {
  product: Product;
  id: string;
  unique_permalink: string;
  thumbnail: Thumbnail | null;
  refund_policies: OtherRefundPolicy[];
  currency_type: CurrencyCode;
  is_tiered_membership: boolean;
  is_listed_on_discover: boolean;
  is_physical: boolean;
  profile_sections: ProfileSection[];
  taxonomies: Taxonomy[];
  earliest_membership_price_change_date: string;
  custom_domain_verification_status: { success: boolean; message: string } | null;
  sales_count_for_inventory: number;
  successful_sales_count: number;
  ratings: RatingsWithPercentages;
  seller: Seller;
  existing_files: ExistingFileEntry[];
  aws_key: string;
  s3_url: string;
  available_countries: ShippingCountry[];
  google_client_id: string;
  google_calendar_enabled: boolean;
  seller_refund_policy_enabled: boolean;
  seller_refund_policy: any;
  cancellation_discounts_enabled: boolean;
  ai_generated: boolean;
};

function ShareEditPage() {
  const pageProps = cast<PageProps>(usePage().props);
  const [imagesUploading, setImagesUploading] = React.useState<Set<File>>(new Set());
  const [contentUpdates, setContentUpdates] = React.useState<ContentUpdates>(null);
  const [existingFiles, setExistingFiles] = React.useState(pageProps.existing_files);
  const [currencyType, setCurrencyType] = React.useState<CurrencyCode>(pageProps.currency_type);

  // Initialize Inertia form with product data
  const form = useForm<Product>({
    ...pageProps.product,
  });

  const updateProduct = (update: Partial<Product> | ((product: Product) => void)) => {
    form.setData((data) => {
      const updated = { ...data };
      if (typeof update === "function") update(updated);
      else Object.assign(updated, update);
      return updated;
    });
  };

  const save = async () => {
    form.patch(`/products/edit/${pageProps.id}/share`, {
      preserveScroll: true,
    });
  };

  const contextValue = React.useMemo(
    () => ({
      id: pageProps.id,
      product: form.data,
      updateProduct,
      uniquePermalink: pageProps.unique_permalink,
      refundPolicies: pageProps.refund_policies,
      thumbnail: pageProps.thumbnail,
      currencyType,
      setCurrencyType,
      isTieredMembership: pageProps.is_tiered_membership,
      isListedOnDiscover: pageProps.is_listed_on_discover,
      isPhysical: pageProps.is_physical,
      profileSections: pageProps.profile_sections,
      taxonomies: pageProps.taxonomies,
      earliestMembershipPriceChangeDate: new Date(pageProps.earliest_membership_price_change_date),
      customDomainVerificationStatus: pageProps.custom_domain_verification_status,
      salesCountForInventory: pageProps.sales_count_for_inventory,
      successfulSalesCount: pageProps.successful_sales_count,
      ratings: pageProps.ratings,
      seller: pageProps.seller,
      existingFiles,
      setExistingFiles,
      awsKey: pageProps.aws_key,
      s3Url: pageProps.s3_url,
      availableCountries: pageProps.available_countries,
      saving: form.processing,
      save,
      googleClientId: pageProps.google_client_id,
      googleCalendarEnabled: pageProps.google_calendar_enabled,
      seller_refund_policy_enabled: pageProps.seller_refund_policy_enabled,
      seller_refund_policy: pageProps.seller_refund_policy,
      cancellationDiscountsEnabled: pageProps.cancellation_discounts_enabled,
      contentUpdates,
      setContentUpdates,
      filesById: new Map(form.data.files.map((file) => [file.id, file])),
      aiGenerated: pageProps.ai_generated,
    }),
    [form.data, form.processing, existingFiles, currencyType, contentUpdates],
  );

  const imageSettings = React.useMemo(
    () => ({
      isUploading: imagesUploading.size > 0,
      onUpload: (file: File) => {
        setImagesUploading((prev) => new Set(prev).add(file));
        return new Promise<string>((resolve, reject) => {
          const upload = new DirectUpload(file, Routes.rails_direct_uploads_path());
          upload.create((error, blob) => {
            setImagesUploading((prev) => {
              const updated = new Set(prev);
              updated.delete(file);
              return updated;
            });

            if (error) reject(error);
            else
              request({
                method: "GET",
                accept: "json",
                url: Routes.s3_utility_cdn_url_for_blob_path({ key: blob.key }),
              })
                .then((response) => response.json())
                .then((data) => resolve(cast<{ url: string }>(data).url))
                .catch((e: unknown) => {
                  assertResponseError(e);
                  reject(e);
                });
          });
        });
      },
      allowedExtensions: ALLOWED_EXTENSIONS,
    }),
    [imagesUploading.size],
  );

  return (
    <ProductEditContext.Provider value={contextValue}>
      <ImageUploadSettingsContext.Provider value={imageSettings}>
        <ShareTab />
      </ImageUploadSettingsContext.Provider>
    </ProductEditContext.Provider>
  );
}

export default ShareEditPage;
