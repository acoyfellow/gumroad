import React from "react";

import type { Purchase } from "$app/components/Admin/Purchases/Purchase";
import DateTimeWithRelativeTooltip from "$app/components/Admin/DateTimeWithRelativeTooltip";
import { NoIcon } from "$app/components/Icons";

type AdminPurchasesFooterProps = {
  purchase: Purchase;
};

const AdminPurchasesFooter = ({ purchase }: AdminPurchasesFooterProps) => {
  return (
    <dl>
      <dt>Updated</dt>
      <dd><DateTimeWithRelativeTooltip date={purchase.updated_at} /></dd>
      <dt>Deleted</dt>
      <dd><DateTimeWithRelativeTooltip date={purchase.deleted_at} placeholder={<NoIcon />} /></dd>
    </dl>
  );
};

export default AdminPurchasesFooter;
