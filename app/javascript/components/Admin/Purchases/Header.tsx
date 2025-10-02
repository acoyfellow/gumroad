import React from "react";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import { Link } from "@inertiajs/react";
import { Icon } from "$app/components/Icons";

type Props = {
  purchase: Purchase;
};

const AdminPurchasesHeader = ({ purchase }: Props) => {
  return (
    <>
      <Link href={Routes.admin_purchase_path(purchase.id)}>{purchase.formatted_display_price}</Link>
        <span>{purchase.formatted_gumroad_tax_amount ? ` + ${purchase.formatted_gumroad_tax_amount} VAT` : null}</span>

        <Link href={Routes.admin_product_url(purchase.link.id)} className="ml-2">{purchase.link.name}</Link>

        <span className="ml-2">{purchase.variants_list}</span>

        <Link href={purchase.link.long_url} target="_blank" className="no-underline ml-2 mr-1">
          <Icon name="arrow-up-right-square" />
        </Link>
    </>
  );
};

export default AdminPurchasesHeader;
