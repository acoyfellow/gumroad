import { usePage } from "@inertiajs/react";
import React from "react";
import { cast } from "ts-safe-cast";

import { default as CustomersPage, CustomerPageProps } from "$app/components/Audience/CustomersPage";

function index() {
  const props = cast<CustomerPageProps>(usePage().props);

  return <CustomersPage {...props} />;
}

export default index;
