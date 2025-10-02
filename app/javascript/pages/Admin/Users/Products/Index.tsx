import React from "react";
import { usePage, WhenVisible } from "@inertiajs/react";
import AdminUserAndProductsTabs from "$app/components/Admin/UserAndProductsTabs";
import { type User as UserType } from "$app/components/Admin/Users/User";
import AdminUsersProductsProduct, { type Product as ProductType } from "$app/components/Admin/Products/Product";
import { type Pagination } from "$app/hooks/useLazyFetch";
import Loading from "$app/components/Admin/Loading";

type AdminUsersProductsContentProps = {
  products: ProductType[];
  is_affiliate_user?: boolean;
  pagination: Pagination;
}

const AdminUsersProductsContent = ({
  products,
  is_affiliate_user = false,
  pagination
}: AdminUsersProductsContentProps) => {
  if (pagination.page === 1 && products.length === 0) {
    return <div className="info" role="status">No products created.</div>;
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <AdminUsersProductsProduct
          key={product.id}
          product={product}
          is_affiliate_user={is_affiliate_user}
        />
      ))}
    </div>
  );
}

type Props = {
  is_affiliate_user?: boolean;
}

type AdminUsersProductsProps = {
  user: UserType;
  products: ProductType[];
  pagination: Pagination;
}

const AdminUsersProducts = ({ is_affiliate_user = false }: Props) => {
  const {
    user,
    products,
    pagination,
  } = usePage().props as unknown as AdminUsersProductsProps;

  const productsLengthFromCurrentPage = products.length / pagination.page;

  const RenderNextProductsWhenVisible = () => {
    if (productsLengthFromCurrentPage >= pagination.limit) {
      const params = {
        data: { page: pagination.page + 1 },
        only: ["products", "pagination"],
        preserveScroll: true
      }

      return <WhenVisible fallback={<Loading />} params={params} children />;
    }
  };

  return (
    <div className="paragraphs">
      <AdminUserAndProductsTabs selectedTab="products" user={user} />
      <AdminUsersProductsContent
        products={products}
        is_affiliate_user={is_affiliate_user}
        pagination={pagination}
      />
      <RenderNextProductsWhenVisible />
    </div>
  )
};

export default AdminUsersProducts;
