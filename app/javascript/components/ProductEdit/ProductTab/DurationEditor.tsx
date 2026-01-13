import * as React from "react";

import { NumberInput } from "$app/components/NumberInput";
import { ToggleSettingRow } from "$app/components/SettingRow";
import { WithTooltip } from "$app/components/WithTooltip";

export const DurationEditor = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) => {
  const uid = React.useId();
  const [isOpen, setIsOpen] = React.useState(value != null);

  return (
    <ToggleSettingRow
      value={isOpen}
      onChange={(open) => {
        if (!open) onChange(null);
        setIsOpen(open);
      }}
      label="Automatically end memberships after a number of months"
      dropdown={
        <fieldset>
          <legend>
            <label htmlFor={uid}>Number of months</label>
          </legend>
          <WithTooltip
            tip="Any change in the length of your membership will only affect new members."
            position="bottom"
          >
            <NumberInput value={value} onChange={onChange}>
              {(props) => <input id={uid} placeholder="∞" {...props} />}
            </NumberInput>
          </WithTooltip>
        </fieldset>
      }
    />
  );
};
