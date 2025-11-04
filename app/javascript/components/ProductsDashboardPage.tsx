import React from "react";

import { Membership, Product } from "$app/data/products";

import { NavigationButtonInertia } from "$app/components/NavigationButton";
import { PaginationProps } from "$app/components/Pagination";
import { ProductsLayout } from "$app/components/ProductsLayout";
import { Search } from "$app/components/Search";
import Placeholder from "$app/components/ui/Placeholder";

import ProductsPage from "./ProductsPage";

import placeholder from "$assets/images/product_nudge.svg";

export type ProductsDashboardPageProps = {
  memberships: Membership[];
  memberships_pagination: PaginationProps;
  products: Product[];
  products_pagination: PaginationProps;
  archived_products_count: number;
  can_create_product: boolean;
};

export const ProductsDashboardPage = ({
  memberships,
  memberships_pagination: membershipsPagination,
  products,
  products_pagination: productsPagination,
  archived_products_count: archivedProductsCount,
  can_create_product: canCreateProduct,
}: ProductsDashboardPageProps) => {
  const [enableArchiveTab, setEnableArchiveTab] = React.useState(archivedProductsCount > 0);
  const [query, setQuery] = React.useState("");

  return (
    <ProductsLayout
      selectedTab="products"
      title="Products"
      archivedTabVisible={enableArchiveTab}
      ctaButton={
        <>
          {products.length > 0 ? <Search value={query} onSearch={setQuery} placeholder="Search products" /> : null}
          <NavigationButtonInertia href={Routes.new_product_path()} disabled={!canCreateProduct} color="accent">
            New product
          </NavigationButtonInertia>
        </>
      }
    >
      <section className="p-4 md:p-8">
        {memberships.length === 0 && products.length === 0 ? (
          <Placeholder>
            <figure>
              <img src={placeholder} />
            </figure>
            <h2>We’ve never met an idea we didn’t like.</h2>
            <p>Your first product doesn’t need to be perfect. Just put it out there, and see if it sticks.</p>
            <div>
              <NavigationButtonInertia href={Routes.new_product_path()} disabled={!canCreateProduct} color="accent">
                New product
              </NavigationButtonInertia>
            </div>
            <span>
              or{" "}
              <a href="/help/article/304-products-dashboard" target="_blank" rel="noreferrer">
                learn more about the products dashboard
              </a>
            </span>
          </Placeholder>
        ) : (
          <ProductsPage
            memberships={memberships}
            membershipsPagination={membershipsPagination}
            products={products}
            productsPagination={productsPagination}
            query={query}
            setEnableArchiveTab={setEnableArchiveTab}
          />
        )}
      </section>
    </ProductsLayout>
  );
};

export default ProductsDashboardPage;
