import React from "react";

import { Membership, Product } from "$app/data/products";

import { NavigationButtonInertia } from "$app/components/NavigationButton";
import { PaginationProps } from "$app/components/Pagination";
import { ProductsLayout } from "$app/components/ProductsLayout";
import ProductsPage from "$app/components/ProductsPage";
import { Search } from "$app/components/Search";

export type ArchivedProductsPageProps = {
  memberships: Membership[];
  memberships_pagination: PaginationProps;
  products: Product[];
  products_pagination: PaginationProps;
  can_create_product: boolean;
};

export const ArchivedProductsPage = ({
  memberships,
  memberships_pagination: membershipsPagination,
  products,
  products_pagination: productsPagination,
  can_create_product: canCreateProduct,
}: ArchivedProductsPageProps) => {
  const [query, setQuery] = React.useState<string | null>(null);

  return (
    <ProductsLayout
      selectedTab="archived"
      title="Products"
      archivedTabVisible
      ctaButton={
        <>
          <Search value={query ?? ""} onSearch={setQuery} placeholder="Search products" />
          <NavigationButtonInertia href={Routes.new_product_path()} disabled={!canCreateProduct} color="accent">
            New product
          </NavigationButtonInertia>
        </>
      }
    >
      <section className="p-4 md:p-8">
        <ProductsPage
          memberships={memberships}
          membershipsPagination={membershipsPagination}
          products={products}
          productsPagination={productsPagination}
          query={query}
          type="archived"
        />
      </section>
    </ProductsLayout>
  );
};

export default ArchivedProductsPage;
