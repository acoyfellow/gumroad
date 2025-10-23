import * as React from "react";

import { BundleProduct } from "$app/components/BundleEdit/state";
import { Thumbnail } from "$app/components/Product/Thumbnail";

export const BundleProductSelector = ({
  bundleProduct,
  selected,
  onToggle,
}: {
  bundleProduct: BundleProduct;
  selected?: boolean;
  onToggle: () => void;
}) => (
  <label className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 p-4">
    <figure className="w-14 overflow-hidden rounded border border-border">
      <Thumbnail url={bundleProduct.thumbnail_url} nativeType={bundleProduct.native_type} />
    </figure>
    <div className="flex-1">
      <h4 className="text-base font-bold">{bundleProduct.name}</h4>
      {bundleProduct.variants ? (
        <div>
          {bundleProduct.variants.list.length} {bundleProduct.variants.list.length === 1 ? "version" : "versions"}{" "}
          available
        </div>
      ) : null}
    </div>
    <section className="self-center">
      <input type="checkbox" checked={!!selected} onChange={onToggle} />
    </section>
  </label>
);
