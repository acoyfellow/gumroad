import React from "react";
import { usePage, router } from "@inertiajs/react";
import AdminPurchases from "$app/components/Admin/Search/Purchases";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import { type Pagination as PaginationProps } from "$app/hooks/useLazyFetch";
import AdminEmptyState from "$app/components/Admin/EmptyState";
import { Pagination } from "$app/components/Pagination";

type Props = {
  purchases: Purchase[];
  query: string;
  product_title_query: string;
  purchase_status: string;
  pagination: PaginationProps;
};

const AdminSearchPurchases = () => {
  const { purchases, pagination, query, product_title_query, purchase_status } = usePage().props as unknown as Props;

  if (purchases.length === 0 && pagination.page === 1) {
    return <AdminEmptyState message="No purchases found." />;
  }

  const paginationProps = {
    pages: pagination.count / pagination.limit,
    page: pagination.page,
  };

  const onChangePage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.visit(Routes.admin_search_purchases_path(), {
      data: Object.fromEntries(params),
      only: ["purchases", "pagination"],
    });
  };

  return (
    <div className="space-y-4">
      <AdminPurchases
        purchases={purchases}
        query={query}
        product_title_query={product_title_query}
        purchase_status={purchase_status}
      />
      <Pagination pagination={paginationProps} onChangePage={onChangePage} />
    </div>
  );
};

export default AdminSearchPurchases;
