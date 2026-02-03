import React from "react";
import { Skeleton } from "$app/components/Skeleton";

export const ProductsContentLoading = () => {
  return (
    <section className="p-4 md:p-8 space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </section>
  );
};
