
import React from "react";
import { router } from "@inertiajs/react";
import AdminPurchasesFilterForm from "$app/components/Admin/Purchases/FilterForm";
import AdminPurchasesPurchase from "$app/components/Admin/Purchases/Purchase";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import { type Pagination as PaginationProps } from "$app/hooks/useLazyFetch";
import { Pagination } from "$app/components/Pagination";
import AdminEmptyState from "$app/components/Admin/EmptyState";

export interface PageProps {
  purchases: Purchase[];
  query: string;
  product_title_query: string;
  purchase_status: string;
  pagination: PaginationProps;
};

interface Props extends PageProps {
  endpoint: (params?: Record<string, string>) => string;
};

const AdminPurchases = ({
  purchases,
  query,
  product_title_query,
  purchase_status,
  endpoint = Routes.admin_search_purchases_path,
  pagination,
}: Props) => {
  const paginationProps = {
    pages: Math.ceil(pagination.count / pagination.limit),
    page: pagination.page,
  };

  const onChangePage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.visit(endpoint(), {
      data: Object.fromEntries(params),
      only: ["purchases", "pagination"],
    });
  };

  return (
    <div className="paragraphs">
      <AdminPurchasesFilterForm
        query={query}
        product_title_query={product_title_query}
        purchase_status={purchase_status}
        endpoint={endpoint}
      />

      {
        purchases.length === 0 && pagination.page === 1 ? (
          <AdminEmptyState message="No purchases found." />
        ) : (
          <>
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

            <Pagination pagination={paginationProps} onChangePage={onChangePage} />
          </>
        )
      }
    </div>
  );
};

export default AdminPurchases;

