import React from "react";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import AdminPurchasesRefund from "$app/components/Admin/Purchases/Refunds/Refund";

const AdminPurchasesRefunds = ({ purchase }: { purchase: Purchase }) => {
  return <div>
    <ul>
      {purchase.refunds.map((refund) => (
        <AdminPurchasesRefund key={refund.id} refund={refund} />
      ))}
    </ul>
  </div>;
};

export default AdminPurchasesRefunds;
