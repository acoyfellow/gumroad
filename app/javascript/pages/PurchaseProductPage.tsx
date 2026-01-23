import * as React from "react";

import { PoweredByFooter } from "$app/components/PoweredByFooter";
import { Product, useSelectionFromUrl, Props as ProductProps } from "$app/components/Product";

const PurchaseProductPage = (props: ProductProps) => {
  const [selection, setSelection] = useSelectionFromUrl(props.product);

  return (
    <div>
      <div>
        <section>
          <Product {...props} selection={selection} setSelection={setSelection} />
        </section>
        <PoweredByFooter className="p-0" />
      </div>
    </div>
  );
};

PurchaseProductPage.disableLayout = true;
export default PurchaseProductPage;
