import { Head, usePage } from "@inertiajs/react";
import * as React from "react";

import { PoweredByFooter } from "$app/components/PoweredByFooter";
import { Layout, Props } from "$app/components/Product/Layout";
import Alert from "$app/components/server-components/Alert";

type PageProps = Props & {
  canonical_url: string;
  structured_data: Record<string, unknown>[];
};

function ProductShowPage() {
  const props = usePage<PageProps>().props;

  return (
    <>
      <Head>
        <link href={props.canonical_url} rel="canonical" />
        {props.structured_data?.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(props.structured_data)}</script>
        )}
      </Head>
      <Alert initial={null} />
      <Layout {...props} />
      <PoweredByFooter />
    </>
  );
}

ProductShowPage.disableLayout = true;
export default ProductShowPage;
