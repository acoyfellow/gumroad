import React from "react";
import DateTimeWithRelativeTooltip from "$app/components/Admin/DateTimeWithRelativeTooltip";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import AdminPurchasesHeader from "$app/components/Admin/Purchases/Header";
import AdminPurchasesState from "$app/components/Admin/Purchases/State";
import AdminPurchasesCreator from "$app/components/Admin/Purchases/Creator";
import AdminPurchasesRefundPolicy from "$app/components/Admin/Purchases/RefundPolicy";

type Props = {
  purchase: Purchase;
};

const AdminPurchasesPurchase = ({ purchase }: Props) => (
  <tr>
    <td data-label="Purchase">
      <AdminPurchasesHeader purchase={purchase} />
      <AdminPurchasesState purchase={purchase} />
      <AdminPurchasesRefundPolicy purchase={purchase} />
    </td>

    <td data-label="By">
      <AdminPurchasesCreator purchase={purchase} />
      <small><DateTimeWithRelativeTooltip date={purchase.created_at} /></small>
    </td>
  </tr>
);

export default AdminPurchasesPurchase;
