import { Head, usePage } from "@inertiajs/react";
import * as React from "react";

import { Taxonomy } from "$app/utils/discover";

import { Layout as DiscoverLayout } from "$app/components/Discover/Layout";
import { Layout, Props } from "$app/components/Product/Layout";
import Alert from "$app/components/server-components/Alert";

type PageProps = Props & {
  taxonomy_path: string | null;
  taxonomies_for_nav: Taxonomy[];
  canonical_url: string;
  structured_data: Record<string, unknown>[];
};

function DiscoverProductShowPage() {
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
      <DiscoverLayout
        taxonomyPath={props.taxonomy_path ?? undefined}
        taxonomiesForNav={props.taxonomies_for_nav}
        forceDomain
      >
        <Layout cart hasHero {...props} />
        {"products" in props ? <div /> : null}
      </DiscoverLayout>
    </>
  );
}

DiscoverProductShowPage.disableLayout = true;
export default DiscoverProductShowPage;
