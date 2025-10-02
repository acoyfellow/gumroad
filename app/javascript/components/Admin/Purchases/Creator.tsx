import React from "react";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import { Link } from "@inertiajs/react";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { Icon } from "$app/components/Icons";

type Props = {
  purchase: Purchase;
};

const AdminPurchasesCreator = ({ purchase }: Props) => (
  <div className="inline-flex items-center space-x-1">
    <Link href={Routes.admin_search_purchases_path({ query: purchase.email })}>{purchase.email}</Link>
    <CopyToClipboard text={purchase.email}>
      <Icon name="outline-duplicate" className="cursor-pointer" />
    </CopyToClipboard>
  </div>
);

export default AdminPurchasesCreator;
