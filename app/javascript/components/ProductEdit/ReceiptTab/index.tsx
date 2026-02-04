import * as React from "react";

import { CustomReceiptTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomReceiptTextInput";
import { CustomViewContentButtonTextInput } from "$app/components/ProductEdit/ReceiptTab/CustomViewContentButtonTextInput";

type ReceiptTabProps = {
  customViewContentButtonText: string | null;
  customReceiptText: string | null;
  customViewContentButtonTextMaxLength: number;
  customReceiptTextMaxLength: number;
  onCustomViewContentButtonTextChange: (value: string | null) => void;
  onCustomReceiptTextChange: (value: string | null) => void;
};

export const ReceiptTab = ({
  customViewContentButtonText,
  customReceiptText,
  customViewContentButtonTextMaxLength,
  customReceiptTextMaxLength,
  onCustomViewContentButtonTextChange,
  onCustomReceiptTextChange,
}: ReceiptTabProps) => (
  <div className="squished">
    <form>
      <section className="p-4! md:p-8!">
        <CustomViewContentButtonTextInput
          value={customViewContentButtonText}
          onChange={onCustomViewContentButtonTextChange}
          maxLength={customViewContentButtonTextMaxLength}
        />
        <CustomReceiptTextInput
          value={customReceiptText}
          onChange={onCustomReceiptTextChange}
          maxLength={customReceiptTextMaxLength}
        />
      </section>
    </form>
  </div>
);
