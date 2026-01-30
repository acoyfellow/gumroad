import * as React from "react";
import { Head, usePage } from "@inertiajs/react";

import { Profile, Props as ProfileProps } from "$app/components/server-components/Profile";

type Props = ProfileProps & {
  card_data_handling_mode: string;
  paypal_merchant_currency: string;
  custom_styles?: string;
};

export default function UserShowPage() {
  const props = usePage<Props>().props;

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      {props.custom_styles ? (
        <Head>
            <style>{props.custom_styles}</style>
        </Head>
      ) : null}
      <Profile {...props} />
    </div>
  );
}

UserShowPage.loggedInUserLayout = true;
