import * as React from "react";

import { CardWishlist, CardGrid, Card } from "$app/components/Wishlist/Card";

export const RecommendedWishlists = ({
  title,
  wishlists,
}: {
  title: string;
  wishlists: CardWishlist[] | null | undefined;
}) => {
  if (!wishlists || wishlists.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2>{title}</h2>
      </header>
      <CardGrid>
        {wishlists.map((wishlist) => (
          // recommended wishlists are in the bottom of the page (off-screen), so we can use lazy loading
          <Card key={wishlist.id} wishlist={wishlist} eager={false} />
        ))}
      </CardGrid>
    </section>
  );
};
