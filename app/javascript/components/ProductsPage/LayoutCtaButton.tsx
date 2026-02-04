import { usePage } from "@inertiajs/react";
import React from "react";
import { cast } from "ts-safe-cast";

import { NavigationButtonInertia } from "$app/components/NavigationButton";
import { Search } from "$app/components/Search";

type Props = {
  query: string;
  setQuery: (query: string) => void;
};

type PageProps = {
  can_create_product: boolean;
};

export const LayoutCtaButton = ({ query, setQuery }: Props) => {
  const { can_create_product: canCreateProduct } = cast<PageProps>(usePage().props);

  return (
    <>
      <Search value={query} onSearch={setQuery} placeholder="Search products" />
      <NavigationButtonInertia href={Routes.new_product_path()} disabled={!canCreateProduct} color="accent">
        New product
      </NavigationButtonInertia>
    </>
  );
};
