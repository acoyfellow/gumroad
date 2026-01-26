import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { CreatorProfile } from "$app/parsers/profile";

import { Product, Purchase } from "$app/components/Product";
import { ConfigurationSelector, PriceSelection } from "$app/components/Product/ConfigurationSelector";
import { CtaButton, getCtaName } from "$app/components/Product/CtaButton";
import { Layout as ProfileLayout } from "$app/components/Profile/Layout";
import { WishlistForProduct } from "$app/components/Product";
import { classNames } from "$app/utils/classNames";

type Props = {
  product: Product;
  purchase: Purchase | null;
  wishlists: WishlistForProduct[];
  discount_code: { valid: boolean; code?: string; discount?: unknown } | null;
  creator_profile: CreatorProfile;
};

export default function CoffeePage() {
  const { product, purchase, creator_profile } = cast<Props>(usePage().props);

  return (
    <ProfileLayout creatorProfile={creator_profile} hideFollowForm>
      <CoffeeProduct
        product={product}
        purchase={purchase}
        selection={null}
        className="mx-auto w-full max-w-6xl lg:px-0"
      />
    </ProfileLayout>
  );
}
CoffeePage.loggedInUserLayout = true;

const CoffeeProduct = ({
  product,
  purchase,
  selection: selectionOverride,
  className,
}: {
  product: Product;
  purchase: Purchase | null;
  selection?: Partial<PriceSelection> | null;
  className?: string;
}) => {
  const [selectionState, setSelection] = React.useState<PriceSelection>({
    optionId: product.options.length > 1 ? (product.options[0]?.id ?? null) : null,
    rent: false,
    recurrence: null,
    price: {
      value: product.options.length === 1 ? (product.options[0]?.price_difference_cents ?? null) : null,
      error: false,
    },
    quantity: 1,
    callStartTime: null,
    payInInstallments: false,
  });
  const selection = { ...selectionState, ...selectionOverride };

  const configurationSelector = (
    <>
      <ConfigurationSelector selection={selection} setSelection={setSelection} product={product} discount={null} />
      <CtaButton
        product={product}
        purchase={purchase}
        discountCode={null}
        selection={selection}
        label={getCtaName(product.custom_button_text_option || "donate_prompt")}
        onClick={(evt) => {
          if (selection.optionId === null && !selection.price.value) {
            evt.preventDefault();
            setSelection({ ...selection, price: { ...selection.price, error: true } });
          }
        }}
      />
    </>
  );

  return (
    <section className={classNames("grid grow content-center gap-12 px-4", className)}>
      <section className="grid gap-8">
        <h1>{product.name}</h1>
        {product.description_html ? <h3 dangerouslySetInnerHTML={{ __html: product.description_html }} /> : null}
      </section>
      <section
        style={{
          minWidth: "66%",
          maxWidth: "32rem",
        }}
      >
        {product.options.length === 1 ? (
          <fieldset
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
            }}
          >
            {configurationSelector}
          </fieldset>
        ) : (
          <section className="flex flex-col gap-4">{configurationSelector}</section>
        )}
      </section>
    </section>
  );
};
