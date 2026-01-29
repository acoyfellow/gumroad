import { useForm, usePage } from "@inertiajs/react";
import * as React from "react";

import { Taxonomy } from "$app/utils/discover";

import { Button, NavigationButton } from "$app/components/Button";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { Icon } from "$app/components/Icons";
import { Layout } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { ProfileSectionsEditor } from "$app/components/ProductEdit/ShareTab/ProfileSectionsEditor";
import { TagSelector } from "$app/components/ProductEdit/ShareTab/TagSelector";
import { TaxonomyEditor } from "$app/components/ProductEdit/ShareTab/TaxonomyEditor";
import { FacebookShareButton } from "$app/components/FacebookShareButton";
import { TwitterShareButton } from "$app/components/TwitterShareButton";
import { Toggle } from "$app/components/Toggle";
import { Alert } from "$app/components/ui/Alert";
import { useRunOnce } from "$app/components/useRunOnce";
import { useDiscoverUrl } from "$app/components/DomainSettings";
import { type Product } from "$app/components/ProductEdit/state";
import { useProductUrl } from "$app/components/BundleEdit/Layout";

type ProfileSection = {
  id: string;
  header: string;
  product_names: string[];
  default: boolean;
};

type SharePageProps = {
  product: Product;
  id: string;
  unique_permalink: string;
  profile_sections: ProfileSection[];
  taxonomies: Taxonomy[];
  is_listed_on_discover: boolean;
};


export default function SharePage() {
  const props = usePage<SharePageProps>().props;
  const { product } = props;
  const currentSeller = useCurrentSeller();
  const discoverUrl = useDiscoverUrl();

  const form = useForm({
    section_ids: product.section_ids,
    taxonomy_id: product.taxonomy_id,
    tags: product.tags,
    display_product_reviews: product.display_product_reviews,
    is_adult: product.is_adult,
  });

  const handleSave = () => {
    form.patch(`/products/edit/${props.unique_permalink}/share`, {
      preserveScroll: true,
    });
  };

  if (!currentSeller) return null;

  const productUrl = useProductUrl()
  const discoverLink = new URL(discoverUrl);
  discoverLink.searchParams.set("query", product.name);

  return (
    <Layout
      preview={
        <ProductPreview
          product={product}
          id={props.id}
          uniquePermalink={props.unique_permalink}
          currencyType="usd"
          ratings={null as any}
          seller_refund_policy_enabled={false}
          seller_refund_policy={{ title: "", fine_print: "" }}
        />
      }
      currentTab="share"
      onSave={handleSave}
      isSaving={form.processing}
    >
      <div className="squished">
        <form>
          <section className="p-4! md:p-8!">
            <DiscoverEligibilityPromo />
            <header>
              <h2>Share</h2>
            </header>
            <div className="flex flex-wrap gap-2">
              <TwitterShareButton url={productUrl} text={`Buy ${product.name} on @Gumroad`} />
              <FacebookShareButton url={productUrl} text={product.name} />
              <CopyToClipboard text={productUrl} tooltipPosition="top">
                <Button color="primary">
                  <Icon name="link" />
                  Copy URL
                </Button>
              </CopyToClipboard>
              <NavigationButton
                href={`https://gum.new?productId=${props.id}`}
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
            sectionIds={form.data.section_ids}
            onChange={(sectionIds) => form.setData("section_ids", sectionIds)}
            profileSections={props.profile_sections}
          />
          <section className="p-8!">
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2>Gumroad Discover</h2>
              <a href="/help/article/79-gumroad-discover" target="_blank" rel="noreferrer">
                Learn more
              </a>
            </header>
            {props.is_listed_on_discover ? (
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
              taxonomyId={form.data.taxonomy_id}
              onChange={(taxonomy_id) => form.setData("taxonomy_id", taxonomy_id)}
              taxonomies={props.taxonomies}
            />
            <TagSelector tags={form.data.tags} onChange={(tags) => form.setData("tags", tags)} />
            <fieldset>
              <Toggle
                value={form.data.display_product_reviews}
                onChange={(newValue) => form.setData("display_product_reviews", newValue)}
              >
                Display your product's 1-5 star rating to prospective customers
              </Toggle>
              <Toggle value={form.data.is_adult} onChange={(newValue) => form.setData("is_adult", newValue)}>
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
}

const DiscoverEligibilityPromo = () => {
  const [show, setShow] = React.useState(false);

  useRunOnce(() => {
    if (localStorage.getItem("showDiscoverEligibilityPromo") !== "false") setShow(true);
  });

  if (!show) return null;

  return (
    <Alert role="status">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <div>
            To appear on Gumroad Discover, make sure to meet all the{" "}
            <a href="/help/article/79-gumroad-discover" target="_blank" rel="noreferrer">
              eligibility criteria
            </a>
            , which includes making at least one successful sale and completing the Risk Review process explained in
            detail{" "}
            <a href="/help/article/13-getting-paid" target="_blank" rel="noreferrer">
              here
            </a>
            .
          </div>
          <button
            className="w-max cursor-pointer underline all-unset"
            onClick={() => {
              localStorage.setItem("showDiscoverEligibilityPromo", "false");
              setShow(false);
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Alert>
  );
};
