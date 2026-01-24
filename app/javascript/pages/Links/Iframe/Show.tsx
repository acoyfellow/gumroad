import { Head, usePage } from "@inertiajs/react";
import * as React from "react";

import { PoweredByFooter } from "$app/components/PoweredByFooter";
import { Product, useSelectionFromUrl, Props as ProductProps } from "$app/components/Product";
import { useElementDimensions } from "$app/components/useElementDimensions";
import { useRunOnce } from "$app/components/useRunOnce";
import Alert from "$app/components/server-components/Alert";

type PageProps = ProductProps & {
  canonical_url: string;
  structured_data: Record<string, unknown>[];
};

function IframeProductShowPage() {
  const props = usePage<PageProps>().props;
  const { canonical_url, structured_data, ...productProps } = props;

  useRunOnce(() => window.parent.postMessage({ type: "loaded" }, "*"));
  useRunOnce(() => window.parent.postMessage({ type: "translations", translations: { close: "Close" } }, "*"));

  const mainRef = React.useRef<HTMLDivElement>(null);
  const dimensions = useElementDimensions(mainRef);

  React.useEffect(() => {
    if (dimensions) window.parent.postMessage({ type: "height", height: dimensions.height }, "*");
  }, [dimensions]);

  const [selection, setSelection] = useSelectionFromUrl(productProps.product);

  return (
    <>
      <Head>
        <link href={canonical_url} rel="canonical" />
        {structured_data?.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(structured_data)}</script>
        )}
      </Head>
      <Alert initial={null} />
      <div>
        <div ref={mainRef}>
          <section>
            <Product
              {...productProps}
              discountCode={productProps.discount_code}
              selection={selection}
              setSelection={setSelection}
              ctaLabel="Add to cart"
            />
          </section>
          <PoweredByFooter className="p-0" />
        </div>
      </div>
    </>
  );
}

IframeProductShowPage.disableLayout = true;
export default IframeProductShowPage;
