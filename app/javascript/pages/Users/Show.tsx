import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { Profile } from "$app/components/Profile";

type Props = React.ComponentProps<typeof Profile> & {
  card_data_handling_mode: string;
  paypal_merchant_currency: string;
};

export default function UserShowPage() {
  const props = cast<Props>(usePage().props);

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      <Profile {...props} />
    </div>
  );
}

UserShowPage.loggedInUserLayout = true;
