import React from "react";
import { type ProductPurchase } from "$app/components/Admin/Purchases/Purchase";
import AdminPurchaseInfoUrlRedirect from "$app/components/Admin/Purchases/Info/UrlRedirect";

const AdminPurchaseInfoProductPurchases = ({
  product_purchases
}: { product_purchases: ProductPurchase[] }) => {
  return (
    <div className="paragraphs">
      <h3>Product Purchases</h3>
      <dl>
        {product_purchases.map((product_purchase) => (
          product_purchase.url_redirect && (
            <React.Fragment key={product_purchase.id}>
              <dt>{product_purchase.link.name}</dt>
              <dd>
                <AdminPurchaseInfoUrlRedirect url_redirect={product_purchase.url_redirect} />
              </dd>
            </React.Fragment>
          )
        ))}
      </dl>
    </div>
  );
};

export default AdminPurchaseInfoProductPurchases;
