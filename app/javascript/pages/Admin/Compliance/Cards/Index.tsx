import React from "react";
import { usePage } from "@inertiajs/react";
import AdminPurchases, { type PageProps } from "$app/components/Admin/Purchases";

const AdminComplianceCards = () => {
  return (
    <div className="space-y-4">
      <AdminPurchases
        {...usePage().props as unknown as PageProps}
        endpoint={Routes.admin_cards_path}
      />
    </div>
  );
};

export default AdminComplianceCards;
