import * as React from "react";

import { CurrencyCode } from "$app/utils/currency";

import { InputtedDiscount, DiscountInput } from "$app/components/CheckoutDashboard/DiscountInput";
import { NumberInput } from "$app/components/NumberInput";
import type { EditProduct } from "$app/components/ProductEdit/state";
import { ToggleSettingRow } from "$app/components/SettingRow";

export const CancellationDiscountSelector = ({
  product,
  currencyCode,
  onChange,
}: {
  product: EditProduct;
  currencyCode: CurrencyCode;
  onChange: (cancellation_discount: EditProduct["cancellation_discount"]) => void;
}) => {
  const cancellationDiscount = product.cancellation_discount;

  const [isEnabled, setIsEnabled] = React.useState(!!cancellationDiscount);

  const [discount, setDiscount] = React.useState<InputtedDiscount>(
    cancellationDiscount
      ? cancellationDiscount.discount.type === "fixed"
        ? { type: "cents", value: cancellationDiscount.discount.cents }
        : { type: "percent", value: cancellationDiscount.discount.percents }
      : { type: "cents", value: null },
  );
  const [durationInBillingCycles, setDurationInBillingCycles] = React.useState<number | null>(
    cancellationDiscount?.duration_in_billing_cycles ?? null,
  );

  React.useEffect(() => {
    if (!isEnabled) {
      onChange(null);
      return;
    }

    if (discount.error || discount.value === null) {
      return;
    }

    onChange({
      discount:
        discount.type === "cents"
          ? { type: "fixed", cents: discount.value }
          : { type: "percent", percents: discount.value },
      duration_in_billing_cycles: durationInBillingCycles,
    });
  }, [isEnabled, discount, durationInBillingCycles, onChange]);

  return (
    <ToggleSettingRow
      value={isEnabled}
      onChange={setIsEnabled}
      label="Offer a cancellation discount"
      dropdown={
        <section className="flex flex-col gap-4">
          <DiscountInput discount={discount} setDiscount={setDiscount} currencyCode={currencyCode} />
          <fieldset>
            <label htmlFor="billing-cycles">Duration in billing cycles</label>
            <NumberInput value={durationInBillingCycles} onChange={setDurationInBillingCycles}>
              {(props) => <input id="billing-cycles" type="text" autoComplete="off" placeholder="∞" {...props} />}
            </NumberInput>
          </fieldset>
        </section>
      }
    />
  );
};
