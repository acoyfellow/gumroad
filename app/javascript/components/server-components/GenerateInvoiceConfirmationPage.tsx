import * as React from "react";
import { createCast } from "ts-safe-cast";

import { register } from "$app/utils/serverComponentUtil";

import { Button } from "$app/components/Button";
import { Stack, StackItem } from "$app/components/ui/Stack";

type EmailConfirmationProps = {
  invoice_url: string;
};

const GenerateInvoiceConfirmationPage = ({ invoice_url }: EmailConfirmationProps) => (
  <Stack main asChild>
    <main className="single-page-form horizontal-form">
      <EmailConfirmation invoice_url={invoice_url} />
    </main>
  </Stack>
);

const EmailConfirmation = ({ invoice_url }: EmailConfirmationProps) => (
  <>
    <StackItem asChild>
      <header className="text-center">
        <h2 className="grow">Generate invoice</h2>
      </header>
    </StackItem>
    <StackItem asChild>
      <form action={invoice_url} className="flex flex-col gap-4" method="get">
        <input type="text" name="email" placeholder="Email address" className="grow" />
        <Button type="submit" color="accent">
          Confirm email
        </Button>
      </form>
    </StackItem>
  </>
);

export default register({ component: GenerateInvoiceConfirmationPage, propParser: createCast() });
