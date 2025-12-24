import { usePage } from "@inertiajs/react";
import React from "react";
import { cast } from "ts-safe-cast";

import { Installment, InstallmentFormContext } from "$app/data/installments";

import { EmailForm } from "$app/components/EmailsPage/EmailForm";
import { EmailsLayout } from "$app/components/EmailsPage/Layout";

export default function EmailsNew() {
  const { context, installment } = cast<{ context: InstallmentFormContext; installment: Installment | null }>(
    usePage().props,
  );

  return (
    <EmailsLayout selectedTab="drafts" hideNewButton>
      <EmailForm context={context} installment={installment} />
    </EmailsLayout>
  );
}
