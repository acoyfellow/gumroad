import * as React from "react";

import { CurrencyCode } from "$app/utils/currency";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { PriceInput } from "$app/components/PriceInput";
import { ShippingCountry, ShippingDestination } from "$app/components/ProductEdit/state";
import { Card, CardContent } from "$app/components/ui/Card";
import { Placeholder } from "$app/components/ui/Placeholder";
import { WithTooltip } from "$app/components/WithTooltip";

export const ShippingDestinationsEditor = ({
  shippingDestinations,
  onChange,
  available_countries,
  currency_type,
}: {
  shippingDestinations: ShippingDestination[];
  onChange: (shippingDestinations: ShippingDestination[]) => void;
  available_countries: ShippingCountry[];
  currency_type: CurrencyCode;
}) => {
  const addShippingDestination = () => {
    if (!available_countries[0]) return;
    onChange([
      ...shippingDestinations,
      {
        country_code: available_countries[0].code,
        one_item_rate_cents: null,
        multiple_items_rate_cents: null,
      },
    ]);
  };

  return (
    <section className="p-4! md:p-8!">
      <header>
        <h2>Shipping destinations</h2>
      </header>
      {shippingDestinations.length > 0 ? (
        <Card>
          {shippingDestinations.map((shippingDestination, index) => (
            <ShippingDestinationRow
              shippingDestination={shippingDestination}
              onChange={(updatedShippingDestination) =>
                onChange([
                  ...shippingDestinations.slice(0, index),
                  updatedShippingDestination,
                  ...shippingDestinations.slice(index + 1),
                ])
              }
              onRemove={() => onChange(shippingDestinations.filter((_, i) => i !== index))}
              key={index}
              available_countries={available_countries}
              currency_type={currency_type}
            />
          ))}
          <CardContent>
            <Button onClick={addShippingDestination} className="grow basis-0">
              <Icon name="plus" />
              Add shipping destination
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Placeholder>
          <h2>Add shipping destinations</h2>
          Choose where you're able to ship your physical product to
          <Button color="primary" onClick={addShippingDestination}>
            <Icon name="box" />
            Add shipping destination
          </Button>
        </Placeholder>
      )}
    </section>
  );
};

const INSERT_DIVIDERS_AFTER_CODES = ["US", "NORTH AMERICA", "ELSEWHERE"];

const ShippingDestinationRow = ({
  shippingDestination,
  onChange,
  onRemove,
  available_countries,
  currency_type,
}: {
  shippingDestination: ShippingDestination;
  onChange: (shippingDestination: ShippingDestination) => void;
  onRemove: () => void;
  available_countries: ShippingCountry[];
  currency_type: CurrencyCode;
}) => {
  const uid = React.useId();

  const updateDestination = (update: Partial<ShippingDestination>) => onChange({ ...shippingDestination, ...update });

  return (
    <CardContent aria-label="Shipping destination">
      <fieldset className="grow basis-0">
        <legend>
          <label htmlFor={`${uid}-country`}>Country</label>
        </legend>
        <div className="flex gap-2">
          <select
            id={`${uid}-country`}
            aria-label="Country"
            className="flex-1"
            value={shippingDestination.country_code}
            onChange={(evt) => updateDestination({ country_code: evt.target.value })}
          >
            {available_countries.map((country) => {
              const shouldInsertDividerAfter = INSERT_DIVIDERS_AFTER_CODES.includes(country.code);

              return (
                <React.Fragment key={country.code}>
                  <option value={country.code}>{country.name}</option>
                  {shouldInsertDividerAfter ? <option disabled>──────────────</option> : null}
                </React.Fragment>
              );
            })}
          </select>
          <WithTooltip position="bottom" tip="Remove">
            <Button color="danger" outline onClick={onRemove} aria-label="Remove shipping destination">
              <Icon name="trash2" />
            </Button>
          </WithTooltip>
        </div>
      </fieldset>
      <div style={{ display: "grid", gridAutoFlow: "column", gap: "var(--spacer-3)", width: "100%" }}>
        <fieldset>
          <legend>
            <label htmlFor={`${uid}-one-item`}>Amount alone</label>
          </legend>
          <PriceInput
            id={`${uid}-one-item`}
            currencyCode={currency_type}
            cents={shippingDestination.one_item_rate_cents}
            placeholder="0"
            onChange={(one_item_rate_cents) => updateDestination({ one_item_rate_cents })}
          />
        </fieldset>
        <fieldset>
          <legend>
            <label htmlFor={`${uid}-multiple-items`}>Amount with others</label>
          </legend>
          <PriceInput
            id={`${uid}-multiple-items`}
            currencyCode={currency_type}
            cents={shippingDestination.multiple_items_rate_cents}
            placeholder="0"
            onChange={(multiple_items_rate_cents) => updateDestination({ multiple_items_rate_cents })}
          />
        </fieldset>
      </div>
    </CardContent>
  );
};
