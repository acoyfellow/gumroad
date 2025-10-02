
import React from "react";
import AdminPurchasesFilterForm from "$app/components/Admin/Search/Purchases/FilterForm";
import AdminPurchasesPurchase from "$app/components/Admin/Search/Purchases/Purchase";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";

type Props = {
  purchases: Purchase[];
  query: string;
  product_title_query: string;
  purchase_status: string;
};

const AdminPurchases = ({
  purchases,
  query,
  product_title_query,
  purchase_status,
}: Props) => {
  return (
    <div className="paragraphs">
      <AdminPurchasesFilterForm query={query} product_title_query={product_title_query} purchase_status={purchase_status} />

      <table>
        <thead>
          <tr>
            <th>Purchase</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <AdminPurchasesPurchase key={purchase.id} purchase={purchase} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPurchases;

