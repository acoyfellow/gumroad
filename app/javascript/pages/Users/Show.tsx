import * as React from "react";
import { usePage } from "@inertiajs/react";
import { createCast } from "ts-safe-cast";

import { Profile } from "$app/components/server-components/Profile";

type Props = {
  profile_props: Record<string, any>;
  card_data_handling_mode: string;
  paypal_merchant_currency: string;
};

export default function Show() {
  const { props } = usePage();
  const { profile_props } = createCast<Props>()(props);

  return <Profile {...profile_props} />;
}
