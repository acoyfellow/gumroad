import { usePage } from "@inertiajs/react";
import React from "react";
import { cast } from "ts-safe-cast";

import { Installment, InstallmentFormContext, TYPE_TO_TAB } from "$app/data/installments";

import { EmailForm } from "$app/components/EmailsPage/EmailForm";
import { EmailsLayout } from "$app/components/EmailsPage/Layout";

export default function EmailsEdit() {
  const { installment, context } = cast<{ installment: Installment; context: InstallmentFormContext }>(usePage().props);

  return (
    <EmailsLayout selectedTab={TYPE_TO_TAB[installment.display_type] ?? "drafts"} hideNewButton>
      <EmailForm context={context} installment={installment} />
    </EmailsLayout>
  );
}
