import { usePage } from "@inertiajs/react";
import React from "react";

import { default as DiscountsPage, DiscountsPageProps } from "$app/components/CheckoutDashboard/DiscountsPage";

function Discounts() {
  const { offer_codes, pages, products, pagination, show_black_friday_banner } = usePage<DiscountsPageProps>().props;

  return (
    <DiscountsPage
      offer_codes={offer_codes}
      pages={pages}
      products={products}
      pagination={pagination}
      show_black_friday_banner={show_black_friday_banner}
    />
  );
}

export default Discounts;
