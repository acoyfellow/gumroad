import { Deferred, router, usePage } from "@inertiajs/react";
import React from "react";

import { ProductsLayout } from "$app/components/ProductsLayout";
import ProductsPage from "$app/components/ProductsPage";
import { ProductsContentLoading } from "$app/components/ProductsPage/ContentLoading";
import { LayoutCtaButton } from "$app/components/ProductsPage/LayoutCtaButton";
import { type ProductsPageProps } from "$app/components/ProductsPage/ProductsPageProps";
import { useDebouncedCallback } from "$app/components/useDebouncedCallback";
import { useOnChange } from "$app/components/useOnChange";

const ProductsContent = ({ query }: { query: string }) => {
  const { memberships_data, products_data } = usePage<ProductsPageProps>().props;
  const { memberships, pagination: membershipsPagination, sort: membershipsSort } = memberships_data;
  const { products, pagination: productsPagination, sort: productsSort } = products_data;

  return (
    <section className="p-4 md:p-8">
      <ProductsPage
        memberships={memberships}
        membershipsPagination={membershipsPagination}
        membershipsSort={membershipsSort}
        products={products}
        productsPagination={productsPagination}
        productsSort={productsSort}
        query={query}
        type="archived"
      />
    </section>
  );
};

const ArchivedProductsIndexPage = () => {
  const { query: initialQuery } = usePage<ProductsPageProps>().props;
  const [query, setQuery] = React.useState(initialQuery ?? "");

  const reloadProducts = useDebouncedCallback(() => {
    router.reload({
      data: { query },
      only: ["products_data", "memberships_data"],
    });
  }, 300);

  useOnChange(() => {
    reloadProducts();
  }, [query]);

  return (
    <ProductsLayout
      selectedTab="archived"
      title="Products"
      archivedTabVisible
      ctaButton={<LayoutCtaButton query={query} setQuery={setQuery} />}
    >
      <section className="p-4 md:p-8">
        <Deferred data={["products_data", "memberships_data"]} fallback={<ProductsContentLoading />}>
          <ProductsContent query={query} />
        </Deferred>
      </section>
    </ProductsLayout>
  );
};

export default ArchivedProductsIndexPage;
