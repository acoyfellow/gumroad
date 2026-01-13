import * as React from "react";

import { CurrencyCode } from "$app/utils/currency";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { PriceInput } from "$app/components/PriceInput";
import type { VersionWithoutRichContent } from "$app/components/ProductEdit/state";

export const SuggestedAmountsEditor = ({
  versions,
  onChange,
  currency_type,
}: {
  versions: VersionWithoutRichContent[];
  onChange: (versions: VersionWithoutRichContent[]) => void;
  currency_type: CurrencyCode;
}) => {
  const nextIdRef = React.useRef(0);

  const updateVersion = (id: string, update: Partial<VersionWithoutRichContent>) => {
    onChange(versions.map((version) => (version.id === id ? { ...version, ...update } : version)));
  };

  const addButton = (
    <Button
      color="primary"
      onClick={() => {
        onChange([
          ...versions,
          {
            id: (nextIdRef.current++, nextIdRef.current.toString()),
            name: "",
            description: "",
            price_difference_cents: 0,
            max_purchase_count: null,
            integrations: {
              discord: false,
              circle: false,
              google_calendar: false,
            },
            newlyAdded: true,
          },
        ]);
      }}
      disabled={versions.length === 3}
    >
      <Icon name="plus" />
      Add amount
    </Button>
  );

  return (
    <fieldset>
      <legend>{versions.length > 1 ? "Suggested amounts" : "Suggested amount"}</legend>
      {versions.map((version, index) => (
        <SuggestedAmountEditor
          key={version.id}
          version={version}
          updateVersion={(update) => updateVersion(version.id, update)}
          onDelete={versions.length > 1 ? () => onChange(versions.filter(({ id }) => id !== version.id)) : null}
          label={`Suggested amount ${index + 1}`}
          onBlur={() =>
            onChange(versions.sort((a, b) => (a.price_difference_cents ?? 0) - (b.price_difference_cents ?? 0)))
          }
          currency_type={currency_type}
        />
      ))}
      {addButton}
    </fieldset>
  );
};

const SuggestedAmountEditor = ({
  version,
  updateVersion,
  onDelete,
  label,
  onBlur,
  currency_type,
}: {
  version: VersionWithoutRichContent;
  updateVersion: (update: Partial<VersionWithoutRichContent>) => void;
  onDelete: (() => void) | null;
  label: string;
  onBlur: () => void;
  currency_type: CurrencyCode;
}) => (
  <section className="flex gap-2">
    <PriceInput
      currencyCode={currency_type}
      cents={version.price_difference_cents}
      onChange={(price_difference_cents) => updateVersion({ price_difference_cents })}
      placeholder="0"
      ariaLabel={label}
      onBlur={onBlur}
    />
    <Button aria-label="Delete" onClick={onDelete ?? undefined} disabled={!onDelete}>
      <Icon name="trash2" />
    </Button>
  </section>
);
