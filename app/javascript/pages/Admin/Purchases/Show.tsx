import React from "react";
import { usePage } from "@inertiajs/react";
import Purchase, { type Purchase as PurchaseType } from "$app/components/Admin/Purchases/Purchase";
import Product, { type Product as ProductType } from "$app/components/Admin/Products/Product";
import User, { type User as UserType } from "$app/components/Admin/Users/User";

type AdminPurchasesShowProps = {
  purchase: PurchaseType;
  product: ProductType;
  user: UserType;
};

const AdminPurchasesShow = () => {
  const { purchase, product, user } = usePage().props as unknown as AdminPurchasesShowProps;

  return (
    <div className="paragraphs">
      <Purchase purchase={purchase} />
      <Product product={product} is_affiliate_user={false} />
      <User user={user} is_affiliate_user={false} />
    </div>
  );
};

export default AdminPurchasesShow;
