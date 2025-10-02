import { usePage } from "@inertiajs/react";
import React from "react";

import { type User } from "$app/components/Admin/Users/User";
import { type Compliance } from "$app/components/Admin/Products/FlagForTosViolations";

import AdminProductHeader from "$app/components/Admin/Products/Header";
import AdminProductDescription from "$app/components/Admin/Products/Description";
import AdminProductDetails from "$app/components/Admin/Products/Details";
import AdminProductInfo from "$app/components/Admin/Products/Info";
import AdminProductActions from "$app/components/Admin/Products/Actions";
import AdminFlagForTosViolations from "$app/components/Admin/Products/FlagForTosViolations";
import AdminProductPurchases from "$app/components/Admin/Products/Purchases";
import AdminProductComments from "$app/components/Admin/Products/Comments";
import AdminProductFooter from "$app/components/Admin/Products/Footer";

type ProductFile = {
  id: number;
  external_id: string;
  s3_filename: string;
};

export type ActiveIntegration = {
  type: string;
};

export type Product = {
  id: number;
  name: string;
  price_cents: number;
  currency_code: string;
  unique_permalink: string;
  preview_url: string;
  cover_placeholder_url: string;
  price_formatted: string;
  created_at: string;
  user_name: string;
  user_id: string;
  admins_can_generate_url_redirects: boolean;
  alive_product_files: ProductFile[];
  stripped_html_safe_description: string;
  alive: boolean;
  is_adult: boolean;
  active_integrations: ActiveIntegration[];
  admins_can_mark_as_staff_picked: boolean;
  admins_can_unmark_as_staff_picked: boolean;
  is_tiered_membership: boolean;
  updated_at: string;
  deleted_at: string;
};

type AdminUsersProductsProductProps = {
  product: Product;
  is_affiliate_user?: boolean;
}

const AdminUsersProductsProduct = ({ product, is_affiliate_user = false }: AdminUsersProductsProductProps) => {
  const { url, props } = usePage();
  const { user, compliance } = props as unknown as { user: User; compliance: Compliance };
  const isCurrentUrl = url === Routes.admin_product_url(product.id);

  return (
    <article className="card" data-product-id={product.unique_permalink}>
      <AdminProductHeader product={product} user={user} isCurrentUrl={isCurrentUrl} />
      <AdminProductDescription product={product} />
      <AdminProductDetails product={product} />
      <AdminProductInfo product={product} />
      <AdminProductActions product={product} />
      <AdminFlagForTosViolations user={user} product={product} compliance={compliance} />
      <AdminProductPurchases product_id={product.id} is_affiliate_user={is_affiliate_user} user_id={user.id} />
      <AdminProductComments product={product} />
      <AdminProductFooter product={product} />
    </article>
  );
};

export default AdminUsersProductsProduct;
