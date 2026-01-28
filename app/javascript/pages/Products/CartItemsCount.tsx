import * as React from "react";
import { usePage } from "@inertiajs/react";
import { CartState, newCartState } from "$app/components/Checkout/cartState";
import { cast } from "ts-safe-cast";

type Props = {
  cart: CartState | null;
};

const CartItemsCount = () => {
  const { cart } = cast<Props>(usePage().props);

  React.useEffect(() => {
    void document.hasStorageAccess().then((hasAccess) =>
      window.parent.postMessage({
        type: "cart-items-count",
        cartItemsCount: hasAccess ? (cart ?? newCartState()).items.length : "not-available",
      }),
    );
  }, [cart]);

  return null;
};

CartItemsCount.disableLayout = true;
export default CartItemsCount;
