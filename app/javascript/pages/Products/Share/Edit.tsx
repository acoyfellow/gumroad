import { useForm, usePage } from "@inertiajs/react";
import hands from "images/illustrations/hands.png";
import * as React from "react";
import { cast } from "ts-safe-cast";

import type { Taxonomy } from "$app/utils/discover";

import { Button, NavigationButton } from "$app/components/Button";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { useDiscoverUrl } from "$app/components/DomainSettings";
import { FacebookShareButton } from "$app/components/FacebookShareButton";
import { Icon } from "$app/components/Icons";
import { Layout, useProductUrl } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { RefundPolicy } from "$app/components/ProductEdit/RefundPolicy";
import { ProfileSectionsEditor } from "$app/components/ProductEdit/ShareTab/ProfileSectionsEditor";
import { TagSelector } from "$app/components/ProductEdit/ShareTab/TagSelector";
import { TaxonomyEditor } from "$app/components/ProductEdit/ShareTab/TaxonomyEditor";
import type { EditProductShare, ProfileSection } from "$app/components/ProductEdit/state";
import { Toggle } from "$app/components/Toggle";
import { TwitterShareButton } from "$app/components/TwitterShareButton";
import { Alert } from "$app/components/ui/Alert";
import { useRunOnce } from "$app/components/useRunOnce";

type EditProductSharePageProps = {
  product: EditProductShare;
  page_metadata: {
    taxonomies: Taxonomy[];
    profile_sections: ProfileSection[];
    successful_sales_count: number;
    sales_count_for_inventory: number;
    is_listed_on_discover: boolean;
    seller_refund_policy_enabled: boolean;
    seller_refund_policy: Pick<RefundPolicy, "title" | "fine_print">;
  };
};

const EditProductSharePage = () => {
  const { product, page_metadata } = cast<EditProductSharePageProps>(usePage().props);
  const form = useForm({ product });
  const [showDiscoverEligibilityPromo, setShowDiscoverEligibilityPromo] = React.useState(false);

  useRunOnce(() => {
    if (localStorage.getItem("showDiscoverEligibilityPromo") !== "false") setShowDiscoverEligibilityPromo(true);
  });

  const currentSeller = useCurrentSeller();
  const url = useProductUrl(product);
  const discoverUrl = useDiscoverUrl();

  if (!currentSeller) return null;
  const discoverLink = new URL(discoverUrl);
  discoverLink.searchParams.set("query", product.name);

  const saveShareFields = (
    options?: { onSuccess?: () => void; onFinish?: () => void },
    saveData?: { next_url?: string; publish?: boolean },
  ) => {
    form.transform((data) => ({
      product: {
        section_ids: data.product.section_ids,
        taxonomy_id: data.product.taxonomy_id,
        tags: data.product.tags,
        display_product_reviews: data.product.display_product_reviews,
        is_adult: data.product.is_adult,
        publish: saveData?.publish,
      },
      ...(saveData?.next_url && { next_url: saveData.next_url }),
    }));

    form.patch(Routes.product_share_path(product.unique_permalink), {
      only: ["product", "errors", "flash"],
      ...(options?.onSuccess && { onSuccess: options.onSuccess }),
      ...(options?.onFinish && { onFinish: options.onFinish }),
    });
  };

  return (
    <Layout
      product={form.data.product}
      selectedTab="share"
      preview={
        <ProductPreview
          product={form.data.product}
          seller_refund_policy_enabled={page_metadata.seller_refund_policy_enabled}
          seller_refund_policy={page_metadata.seller_refund_policy}
          sales_count_for_inventory={page_metadata.sales_count_for_inventory}
          successful_sales_count={page_metadata.successful_sales_count}
        />
      }
      processing={form.processing}
      save={saveShareFields}
      isFormDirty={form.isDirty}
    >
      <div className="squished">
        <form>
          <section className="p-4! md:p-8!">
            {showDiscoverEligibilityPromo ? (
              <Alert role="status">
                <div className="flex items-center gap-2">
                  <img src={hands} alt="" className="size-12" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div>
                      To appear on Gumroad Discover, make sure to meet all the{" "}
                      <a href="/help/article/79-gumroad-discover" target="_blank" rel="noreferrer">
                        eligibility criteria
                      </a>
                      , which includes making at least one successful sale and completing the Risk Review process
                      explained in detail{" "}
                      <a href="/help/article/13-getting-paid" target="_blank" rel="noreferrer">
                        here
                      </a>
                      .
                    </div>
                    <button
                      className="w-max cursor-pointer underline all-unset"
                      onClick={() => {
                        localStorage.setItem("showDiscoverEligibilityPromo", "false");
                        setShowDiscoverEligibilityPromo(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Alert>
            ) : null}
            <header>
              <h2>Share</h2>
            </header>
            <div className="flex flex-wrap gap-2">
              <TwitterShareButton url={url} text={`Buy ${product.name} on @Gumroad`} />
              <FacebookShareButton url={url} text={product.name} />
              <CopyToClipboard text={url} tooltipPosition="top">
                <Button color="primary">
                  <Icon name="link" />
                  Copy URL
                </Button>
              </CopyToClipboard>
              <NavigationButton
                href={`https://gum.new?productId=${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                color="accent"
              >
                <Icon name="plus" />
                Create Gum
              </NavigationButton>
            </div>
          </section>
          <ProfileSectionsEditor
            sectionIds={form.data.product.section_ids}
            onChange={(sectionIds) => form.setData("product.section_ids", sectionIds)}
            profileSections={page_metadata.profile_sections}
          />
          <section className="p-8!">
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2>Gumroad Discover</h2>
              <a href="/help/article/79-gumroad-discover" target="_blank" rel="noreferrer">
                Learn more
              </a>
            </header>
            {page_metadata.is_listed_on_discover ? (
              <Alert role="status" variant="success">
                <div className="flex flex-col justify-between sm:flex-row">
                  {product.name} is listed on Gumroad Discover.
                  <a href={discoverLink.toString()}>View</a>
                </div>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-4">
              <p>
                Gumroad Discover recommends your products to prospective customers for a flat 30% fee on each sale,
                helping you grow beyond your existing following and find even more people who care about your work.
              </p>
              <p>When enabled, the product will also become part of the Gumroad affiliate program.</p>
            </div>
            <TaxonomyEditor
              taxonomyId={form.data.product.taxonomy_id}
              onChange={(taxonomy_id) => form.setData("product.taxonomy_id", taxonomy_id)}
              taxonomies={page_metadata.taxonomies}
            />
            <TagSelector tags={form.data.product.tags} onChange={(tags) => form.setData("product.tags", tags)} />
            <fieldset>
              <Toggle
                value={form.data.product.display_product_reviews}
                onChange={(newValue) => form.setData("product.display_product_reviews", newValue)}
              >
                Display your product's 1-5 star rating to prospective customers
              </Toggle>
              <Toggle
                value={form.data.product.is_adult}
                onChange={(newValue) => form.setData("product.is_adult", newValue)}
              >
                This product contains content meant{" "}
                <a href="/help/article/156-gumroad-and-adult-content" target="_blank" rel="noreferrer">
                  only for adults,
                </a>{" "}
                including the preview
              </Toggle>
            </fieldset>
          </section>
        </form>
      </div>
    </Layout>
  );
};

export default EditProductSharePage;
