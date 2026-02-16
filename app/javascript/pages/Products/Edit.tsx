import { useForm, usePage } from "@inertiajs/react";
import { DirectUpload } from "@rails/activestorage";
import * as React from "react";
import { cast, is } from "ts-safe-cast";

import { OtherRefundPolicy } from "$app/data/products/other_refund_policies";
import { COFFEE_CUSTOM_BUTTON_TEXT_OPTIONS, CUSTOM_BUTTON_TEXT_OPTIONS } from "$app/parsers/product";
import { currencyCodeList } from "$app/utils/currency";
import { Taxonomy } from "$app/utils/discover";
import { recurrenceLabels, recurrenceIds } from "$app/utils/recurringPricing";
import { assertResponseError, request } from "$app/utils/request";

import { CopyToClipboard } from "$app/components/CopyToClipboard";
import CustomDomain from "$app/components/CustomDomain";
import { Icon } from "$app/components/Icons";
import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { AttributesEditor } from "$app/components/ProductEdit/ProductTab/AttributesEditor";
import { AvailabilityEditor } from "$app/components/ProductEdit/ProductTab/AvailabilityEditor";
import { BundleConversionNotice } from "$app/components/ProductEdit/ProductTab/BundleConversionNotice";
import { CallLimitationsEditor } from "$app/components/ProductEdit/ProductTab/CallLimitationsEditor";
import { CancellationDiscountSelector } from "$app/components/ProductEdit/ProductTab/CancellationDiscountSelector";
import { CircleIntegrationEditor } from "$app/components/ProductEdit/ProductTab/CircleIntegrationEditor";
import { CoverEditor } from "$app/components/ProductEdit/ProductTab/CoverEditor";
import { CustomButtonTextOptionInput } from "$app/components/ProductEdit/ProductTab/CustomButtonTextOptionInput";
import { CustomPermalinkInput } from "$app/components/ProductEdit/ProductTab/CustomPermalinkInput";
import { CustomSummaryInput } from "$app/components/ProductEdit/ProductTab/CustomSummaryInput";
import { DescriptionEditor, useImageUpload } from "$app/components/ProductEdit/ProductTab/DescriptionEditor";
import { DiscordIntegrationEditor } from "$app/components/ProductEdit/ProductTab/DiscordIntegrationEditor";
import { DurationEditor } from "$app/components/ProductEdit/ProductTab/DurationEditor";
import { DurationsEditor } from "$app/components/ProductEdit/ProductTab/DurationsEditor";
import { FreeTrialSelector } from "$app/components/ProductEdit/ProductTab/FreeTrialSelector";
import { GoogleCalendarIntegrationEditor } from "$app/components/ProductEdit/ProductTab/GoogleCalendarIntegrationEditor";
import { MaxPurchaseCountToggle } from "$app/components/ProductEdit/ProductTab/MaxPurchaseCountToggle";
import { PriceEditor } from "$app/components/ProductEdit/ProductTab/PriceEditor";
import { ShippingDestinationsEditor } from "$app/components/ProductEdit/ProductTab/ShippingDestinationsEditor";
import { SuggestedAmountsEditor } from "$app/components/ProductEdit/ProductTab/SuggestedAmountsEditor";
import { ThumbnailEditor } from "$app/components/ProductEdit/ProductTab/ThumbnailEditor";
import { TiersEditor } from "$app/components/ProductEdit/ProductTab/TiersEditor";
import { VersionsEditor } from "$app/components/ProductEdit/ProductTab/VersionsEditor";
import { RefundPolicy, RefundPolicySelector } from "$app/components/ProductEdit/RefundPolicy";
import type {
  ProfileSection,
  ShippingCountry,
  EditProduct,
  VersionWithoutRichContent,
} from "$app/components/ProductEdit/state";
import { checkFilesUploading } from "$app/components/ProductEdit/utils";
import { ImageUploadSettingsContext } from "$app/components/RichTextEditor";
import { ToggleSettingRow } from "$app/components/SettingRow";
import { TypeSafeOptionSelect } from "$app/components/TypeSafeOptionSelect";
import { Alert } from "$app/components/ui/Alert";
import { Switch } from "$app/components/ui/Switch";

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

type EditProductPageProps = {
  product: EditProduct;
  page_metadata: {
    allowed_refund_periods_in_days: { key: number; value: string }[];
    max_view_content_button_text_length: number;
    integration_names: string[];
    available_countries: ShippingCountry[];
    taxonomies: Taxonomy[];
    refund_policies: OtherRefundPolicy[];
    is_physical: boolean;
    profile_sections: ProfileSection[];
    custom_domain_verification_status: {
      success: boolean;
      message: string;
    } | null;
    earliest_membership_price_change_date: string;
    cancellation_discounts_enabled: boolean;
    successful_sales_count: number;
    sales_count_for_inventory: number;
    google_client_id: string;
    google_calendar_enabled: boolean;
    seller_refund_policy_enabled: boolean;
    seller_refund_policy: Pick<RefundPolicy, "title" | "fine_print">;
  };
};

const EditProductPage = () => {
  const uid = React.useId();

  const { product, page_metadata } = cast<EditProductPageProps>(usePage().props);
  const form = useForm({ product });

  const [thumbnail, setThumbnail] = React.useState(product.thumbnail);
  const [showAiNotification, setShowAiNotification] = React.useState(product.ai_generated);

  const { isUploading, setImagesUploading } = useImageUpload();

  const [showRefundPolicyPreview, setShowRefundPolicyPreview] = React.useState(false);

  const isUploadingFiles = React.useMemo(
    () => checkFilesUploading(form.data.product.files, form.data.product.public_files),
    [form.data.product.files, form.data.product.public_files],
  );

  const isCoffee = form.data.product.native_type === "coffee";
  const url = useProductUrl(form.data.product);

  const saveProductFields = (
    options?: { onSuccess?: () => void; onFinish?: () => void },
    saveData?: { next_url?: string; publish?: boolean },
  ) => {
    form.transform((data) => ({
      product: {
        ...data.product,
        price_currency_type: data.product.currency_type,
        covers: data.product.covers.map(({ id }) => id),
        variants: data.product.variants.map(({ newlyAdded, ...variant }) =>
          newlyAdded ? { ...variant, id: null } : variant,
        ),
        availabilities: data.product.availabilities.map(({ newlyAdded, ...availability }) =>
          newlyAdded ? { ...availability, id: null } : availability,
        ),
        installment_plan: data.product.allow_installment_plan ? data.product.installment_plan : null,
        publish: saveData?.publish,
      },
      ...(saveData?.next_url && { next_url: saveData.next_url }),
    }));

    form.patch(Routes.product_path(form.data.product.unique_permalink), {
      only: ["product", "errors", "flash"],
      preserveState: true,
      onSuccess: (data) => {
        options?.onSuccess?.();
        options?.onFinish?.();
        if (data.url === Routes.edit_product_path(form.data.product.unique_permalink)) {
          form.setData("product", cast<EditProduct>(data.props.product));
          form.setDefaults();
        }
      },
      ...(options?.onFinish && { onError: options.onFinish }),
    });
  };

  const imageSettings = React.useMemo(
    () => ({
      onUpload: (file: File) =>
        new Promise<string>((resolve, reject) => {
          const upload = new DirectUpload(file, Routes.rails_direct_uploads_path());
          upload.create((error, blob) => {
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
        }),
      allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    }),
    [],
  );

  return (
    <ImageUploadSettingsContext.Provider value={imageSettings}>
      <Layout
        product={form.data.product}
        preview={
          <ProductPreview
            product={form.data.product}
            showRefundPolicyModal={showRefundPolicyPreview}
            seller_refund_policy_enabled={page_metadata.seller_refund_policy_enabled}
            seller_refund_policy={page_metadata.seller_refund_policy}
            sales_count_for_inventory={page_metadata.sales_count_for_inventory}
            successful_sales_count={page_metadata.successful_sales_count}
          />
        }
        isLoading={isUploading}
        selectedTab="product"
        save={saveProductFields}
        processing={form.processing}
        isUploadingFiles={isUploadingFiles}
        isFormDirty={form.isDirty}
      >
        <div className="squished">
          <form>
            <section className="p-4! md:p-8!">
              {showAiNotification ? (
                <Alert role="status" variant="accent">
                  <div className="flex items-center gap-4">
                    <Icon className="text-lg" name="sparkle" />
                    <div className="flex-1">
                      <strong>Your AI product is ready!</strong> Take a moment to check out the product and content
                      tabs. Tweak things and make it your own—this is your time to shine!
                    </div>
                    <button
                      className="cursor-pointer self-center underline all-unset"
                      onClick={() => setShowAiNotification(false)}
                    >
                      close
                    </button>
                  </div>
                </Alert>
              ) : null}
              <BundleConversionNotice product={form.data.product} />
              <fieldset>
                <label htmlFor={`${uid}-name`}>{isCoffee ? "Header" : "Name"}</label>
                <input
                  id={`${uid}-name`}
                  type="text"
                  value={form.data.product.name}
                  onChange={(evt) => form.setData("product.name", evt.target.value)}
                />
              </fieldset>
              {isCoffee ? (
                <>
                  <fieldset>
                    <label htmlFor={`${uid}-body`}>Body</label>
                    <textarea
                      id={`${uid}-body`}
                      value={form.data.product.description}
                      placeholder="Add a short inspiring message"
                      onChange={(evt) => form.setData("product.description", evt.target.value)}
                    />
                  </fieldset>
                  <fieldset>
                    <legend>
                      <label htmlFor={`${uid}-url`}>URL</label>
                      <CopyToClipboard text={url}>
                        <button type="button" className="cursor-pointer font-normal underline all-unset">
                          Copy URL
                        </button>
                      </CopyToClipboard>
                    </legend>
                    <input id={`${uid}-url`} type="text" value={url} disabled />
                  </fieldset>
                </>
              ) : (
                <>
                  <DescriptionEditor
                    id={form.data.product.id}
                    initialDescription={product.description}
                    onChange={(description) => form.setData("product.description", description)}
                    setImagesUploading={setImagesUploading}
                    publicFiles={form.data.product.public_files}
                    updatePublicFiles={(updater) => {
                      form.setData((current) => {
                        const files = [...current.product.public_files];
                        updater(files);
                        return {
                          ...current,
                          product: {
                            ...current.product,
                            public_files: files.map((file) => ({ ...file })),
                          },
                        };
                      });
                    }}
                    audioPreviewsEnabled={form.data.product.audio_previews_enabled}
                  />
                  <CustomPermalinkInput
                    value={form.data.product.custom_permalink}
                    onChange={(value) => form.setData("product.custom_permalink", value)}
                    uniquePermalink={form.data.product.unique_permalink}
                    url={url}
                  />
                </>
              )}
            </section>
            {isCoffee && is<VersionWithoutRichContent[]>(form.data.product.variants) ? (
              <>
                <section className="p-4! md:p-8!">
                  <h2>Pricing</h2>
                  <SuggestedAmountsEditor
                    versions={form.data.product.variants}
                    onChange={(variants) => form.setData("product.variants", variants)}
                    currencyCode={form.data.product.currency_type}
                  />
                </section>
                <section className="p-4! md:p-8!">
                  <h2>Settings</h2>
                  <CustomButtonTextOptionInput
                    value={form.data.product.custom_button_text_option}
                    onChange={(value) => form.setData("product.custom_button_text_option", value)}
                    options={COFFEE_CUSTOM_BUTTON_TEXT_OPTIONS}
                  />
                </section>
              </>
            ) : (
              <>
                <CoverEditor
                  covers={form.data.product.covers}
                  setCovers={(covers) => form.setData("product.covers", covers)}
                  permalink={form.data.product.unique_permalink}
                />
                <ThumbnailEditor
                  covers={form.data.product.covers}
                  thumbnail={thumbnail}
                  setThumbnail={setThumbnail}
                  permalink={form.data.product.unique_permalink}
                  nativeType={form.data.product.native_type}
                />
                <section className="p-4! md:p-8!">
                  <h2>Product info</h2>
                  {form.data.product.native_type !== "membership" ? (
                    <CustomButtonTextOptionInput
                      value={form.data.product.custom_button_text_option}
                      onChange={(value) => form.setData("product.custom_button_text_option", value)}
                      options={CUSTOM_BUTTON_TEXT_OPTIONS}
                    />
                  ) : null}
                  <CustomSummaryInput
                    value={form.data.product.custom_summary}
                    onChange={(value) => form.setData("product.custom_summary", value)}
                  />
                  <AttributesEditor
                    customAttributes={form.data.product.custom_attributes}
                    setCustomAttributes={(custom_attributes) =>
                      form.setData("product.custom_attributes", custom_attributes)
                    }
                    fileAttributes={form.data.product.file_attributes}
                    setFileAttributes={(file_attributes) => form.setData("product.file_attributes", file_attributes)}
                  />
                </section>
                <section className="p-4! md:p-8!">
                  <h2>Integrations</h2>
                  <fieldset>
                    {form.data.product.community_chat_enabled === null ? null : (
                      <ToggleSettingRow
                        label="Invite your customers to your Gumroad community chat"
                        value={form.data.product.community_chat_enabled}
                        onChange={(newValue) => form.setData("product.community_chat_enabled", newValue)}
                        help={{
                          label: "Learn more",
                          url: "/help/article/347-gumroad-community",
                        }}
                      />
                    )}
                    <CircleIntegrationEditor
                      integration={form.data.product.integrations.circle}
                      onChange={(newIntegration) => form.setData("product.integrations.circle", newIntegration)}
                      variants={form.data.product.variants}
                      native_type={form.data.product.native_type}
                      setEnabledForOptions={(enabled) => {
                        form.data.product.variants.forEach((_, index) => {
                          form.setData(`product.variants.${index}.integrations.circle`, enabled);
                        });
                      }}
                    />
                    <DiscordIntegrationEditor
                      integration={form.data.product.integrations.discord}
                      onChange={(newIntegration) => form.setData("product.integrations.discord", newIntegration)}
                      variants={form.data.product.variants}
                      native_type={form.data.product.native_type}
                      setEnabledForOptions={(enabled) => {
                        form.data.product.variants.forEach((_, index) => {
                          form.setData(`product.variants.${index}.integrations.discord`, enabled);
                        });
                      }}
                    />
                    {form.data.product.native_type === "call" && page_metadata.google_calendar_enabled ? (
                      <GoogleCalendarIntegrationEditor
                        integration={form.data.product.integrations.google_calendar}
                        onChange={(newIntegration) =>
                          form.setData("product.integrations.google_calendar", newIntegration)
                        }
                        setEnabledForOptions={(enabled) => {
                          form.data.product.variants.forEach((_, index) => {
                            form.setData(`product.variants.${index}.integrations.google_calendar`, enabled);
                          });
                        }}
                        googleClientId={page_metadata.google_client_id}
                      />
                    ) : null}
                  </fieldset>
                </section>
                {form.data.product.native_type === "membership" ? (
                  <section className="p-4! md:p-8!">
                    <h2>Tiers</h2>
                    <TiersEditor
                      tiers={form.data.product.variants}
                      onChange={(variants) => form.setData("product.variants", variants)}
                      product={form.data.product}
                      unique_permalink={form.data.product.unique_permalink}
                      currencyCode={form.data.product.currency_type}
                      earliestMembershipPriceChangeDate={new Date(page_metadata.earliest_membership_price_change_date)}
                    />
                  </section>
                ) : (
                  <>
                    <section className="p-4! md:p-8!">
                      <h2>Pricing</h2>
                      <PriceEditor
                        priceCents={form.data.product.price_cents}
                        suggestedPriceCents={form.data.product.suggested_price_cents}
                        isPWYW={form.data.product.customizable_price}
                        setPriceCents={(priceCents) => {
                          form.setData("product.price_cents", priceCents);
                          if (priceCents === 0) form.setData("product.customizable_price", true);
                        }}
                        setSuggestedPriceCents={(suggestedPriceCents) =>
                          form.setData("product.suggested_price_cents", suggestedPriceCents)
                        }
                        currencyCodeSelector={{
                          options: currencyCodeList,
                          onChange: (currencyCode) => {
                            form.setData("product.currency_type", currencyCode);
                          },
                        }}
                        setIsPWYW={(isPWYW) => form.setData("product.customizable_price", isPWYW)}
                        currencyType={form.data.product.currency_type}
                        eligibleForInstallmentPlans={form.data.product.eligible_for_installment_plans}
                        allowInstallmentPlan={form.data.product.allow_installment_plan}
                        numberOfInstallments={form.data.product.installment_plan?.number_of_installments ?? null}
                        onAllowInstallmentPlanChange={(allowed) =>
                          form.setData("product.allow_installment_plan", allowed)
                        }
                        onNumberOfInstallmentsChange={(value) =>
                          form.setData("product.installment_plan", {
                            ...form.data.product.installment_plan,
                            number_of_installments: value,
                          })
                        }
                        uniquePermalink={form.data.product.unique_permalink}
                        defaultOfferCode={form.data.product.default_offer_code}
                        onDefaultOfferCodeUpdate={(offerCode) => {
                          form.setData("product.default_offer_code_id", offerCode.default_offer_code_id);
                          form.setData("product.default_offer_code", offerCode.default_offer_code);
                        }}
                      />
                      {form.data.product.native_type === "commission" ? (
                        <p
                          style={{
                            marginTop: "var(--spacer-2)",
                            fontSize: "var(--font-size-small)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Commission products use a 50% deposit upfront, 50% upon completion payment split.
                        </p>
                      ) : null}
                    </section>
                    {form.data.product.native_type === "call" ? (
                      <>
                        <section className="p-4! md:p-8!">
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <h2>Durations</h2>
                            <a
                              href="https://gumroad.com/help/article/70-can-i-sell-services#call"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Learn more
                            </a>
                          </div>
                          <DurationsEditor
                            durations={form.data.product.variants}
                            onChange={(variants) => form.setData("product.variants", variants)}
                            currencyCode={form.data.product.currency_type}
                          />
                        </section>
                        <section className="p-4! md:p-8!">
                          <h2>Available hours</h2>
                          <AvailabilityEditor
                            availabilities={form.data.product.availabilities}
                            onChange={(availabilities) => form.setData("product.availabilities", availabilities)}
                          />
                        </section>
                        {form.data.product.call_limitation_info ? (
                          <section className="p-4! md:p-8!">
                            <h2>Call limitations</h2>
                            <CallLimitationsEditor
                              callLimitations={form.data.product.call_limitation_info}
                              onChange={(call_limitation_info) =>
                                form.setData("product.call_limitation_info", call_limitation_info)
                              }
                            />
                          </section>
                        ) : null}
                      </>
                    ) : (
                      <section aria-label="Version editor" className="p-4! md:p-8!">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <h2>{form.data.product.native_type === "physical" ? "Variants" : "Versions"}</h2>
                          <a
                            href="/help/article/126-setting-up-versions-on-a-digital-product"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Learn more
                          </a>
                        </div>
                        {is<VersionWithoutRichContent[]>(form.data.product.variants) ? (
                          <VersionsEditor
                            versions={form.data.product.variants}
                            onChange={(variants) => form.setData("product.variants", variants)}
                            product={form.data.product}
                            currencyCode={form.data.product.currency_type}
                          />
                        ) : null}
                      </section>
                    )}
                  </>
                )}
                {page_metadata.is_physical ? (
                  <ShippingDestinationsEditor
                    shippingDestinations={form.data.product.shipping_destinations}
                    onChange={(shipping_destinations) =>
                      form.setData("product.shipping_destinations", shipping_destinations)
                    }
                    availableCountries={page_metadata.available_countries}
                    currencyCode={form.data.product.currency_type}
                  />
                ) : null}
                <section className="p-4! md:p-8!">
                  <h2>Settings</h2>
                  <fieldset>
                    {form.data.product.native_type === "membership" ? (
                      <>
                        <FreeTrialSelector
                          product={form.data.product}
                          onUpdate={(update) => {
                            if ("free_trial_enabled" in update)
                              form.setData("product.free_trial_enabled", update.free_trial_enabled);
                            if ("free_trial_duration_amount" in update)
                              form.setData("product.free_trial_duration_amount", update.free_trial_duration_amount);
                            if ("free_trial_duration_unit" in update)
                              form.setData("product.free_trial_duration_unit", update.free_trial_duration_unit);
                          }}
                        />
                        {page_metadata.cancellation_discounts_enabled ? (
                          <CancellationDiscountSelector
                            product={form.data.product}
                            currencyCode={form.data.product.currency_type}
                            onChange={(cancellation_discount) =>
                              form.setData("product.cancellation_discount", cancellation_discount)
                            }
                          />
                        ) : null}
                        <Switch
                          checked={form.data.product.should_include_last_post}
                          onChange={(e) => form.setData("product.should_include_last_post", e.target.checked)}
                          label="New members will be emailed this product's last published post"
                        />
                        <Switch
                          checked={form.data.product.should_show_all_posts}
                          onChange={(e) => form.setData("product.should_show_all_posts", e.target.checked)}
                          label="New members will get access to all posts you have published"
                        />
                        <Switch
                          checked={product.block_access_after_membership_cancellation}
                          onChange={(e) =>
                            form.setData("product.block_access_after_membership_cancellation", e.target.checked)
                          }
                          label="Members will lose access when their memberships end"
                        />
                        <DurationEditor
                          value={form.data.product.duration_in_months}
                          onChange={(duration_in_months) =>
                            form.setData("product.duration_in_months", duration_in_months)
                          }
                        />
                      </>
                    ) : null}
                    {form.data.product.can_enable_quantity ? (
                      <>
                        <MaxPurchaseCountToggle
                          maxPurchaseCount={form.data.product.max_purchase_count}
                          setMaxPurchaseCount={(value) => form.setData("product.max_purchase_count", value)}
                        />
                        <Switch
                          checked={form.data.product.quantity_enabled}
                          onChange={(e) => form.setData("product.quantity_enabled", e.target.checked)}
                          label="Allow customers to choose a quantity"
                        />
                      </>
                    ) : null}
                    {form.data.product.variants.length > 0 ? (
                      <Switch
                        checked={form.data.product.hide_sold_out_variants}
                        onChange={(e) => form.setData("product.hide_sold_out_variants", e.target.checked)}
                        label="Hide sold out versions"
                      />
                    ) : null}
                    <Switch
                      checked={form.data.product.should_show_sales_count}
                      onChange={(e) => form.setData("product.should_show_sales_count", e.target.checked)}
                      label={
                        form.data.product.native_type === "membership"
                          ? "Publicly show the number of members on your product page"
                          : "Publicly show the number of sales on your product page"
                      }
                    />
                    {form.data.product.native_type !== "physical" ? (
                      <Switch
                        checked={form.data.product.is_epublication}
                        onChange={(e) => form.setData("product.is_epublication", e.target.checked)}
                        label={
                          <>
                            Mark product as e-publication for VAT purposes{" "}
                            <a href="/help/article/10-dealing-with-vat" target="_blank" rel="noreferrer">
                              Learn more
                            </a>
                          </>
                        }
                      />
                    ) : null}
                    {!page_metadata.seller_refund_policy_enabled ? (
                      <RefundPolicySelector
                        refundPolicy={form.data.product.refund_policy}
                        setRefundPolicy={(newValue) => form.setData("product.refund_policy", newValue)}
                        refundPolicies={page_metadata.refund_policies}
                        isEnabled={form.data.product.product_refund_policy_enabled}
                        setIsEnabled={(newValue) => form.setData("product.product_refund_policy_enabled", newValue)}
                        setShowPreview={setShowRefundPolicyPreview}
                      />
                    ) : null}
                    <Switch
                      checked={form.data.product.require_shipping}
                      onChange={(e) => form.setData("product.require_shipping", e.target.checked)}
                      label="Require shipping information"
                    />
                  </fieldset>
                  {form.data.product.native_type === "membership" ? (
                    <fieldset>
                      <legend>
                        <label htmlFor={`${uid}-subscription-duration`}>Default payment frequency</label>
                      </legend>
                      <TypeSafeOptionSelect
                        id={`${uid}-subscription-duration`}
                        value={form.data.product.subscription_duration || "monthly"}
                        onChange={(subscription_duration) =>
                          form.setData("product.subscription_duration", subscription_duration)
                        }
                        options={recurrenceIds.map((recurrenceId) => ({
                          id: recurrenceId,
                          label: recurrenceLabels[recurrenceId],
                        }))}
                      />
                    </fieldset>
                  ) : null}
                  <CustomDomain
                    verificationStatus={page_metadata.custom_domain_verification_status}
                    customDomain={form.data.product.custom_domain}
                    setCustomDomain={(custom_domain) => form.setData("product.custom_domain", custom_domain)}
                    label="Custom domain"
                    productId={form.data.product.id}
                    includeLearnMoreLink
                  />
                </section>
              </>
            )}
          </form>
        </div>
      </Layout>
    </ImageUploadSettingsContext.Provider>
  );
};
export default EditProductPage;
