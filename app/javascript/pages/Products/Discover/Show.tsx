import { usePage } from "@inertiajs/react";

import { Taxonomy } from "$app/utils/discover";

import { Layout as DiscoverLayout } from "$app/components/Discover/Layout";
import { Layout, Props } from "$app/components/Product/Layout";

type PageProps = Props & {
  taxonomy_path: string | null;
  taxonomies_for_nav: Taxonomy[];
  custom_styles: string;
};

function DiscoverProductShowPage() {
  const props = usePage<PageProps>().props;

  return (
    <>
      <style>{props.custom_styles}</style>
      <DiscoverLayout
        taxonomyPath={props.taxonomy_path ?? undefined}
        taxonomiesForNav={props.taxonomies_for_nav}
        forceDomain
      >
        <Layout cart hasHero {...props} />
        {/* Render an empty div for the add section button */}
        {"products" in props ? <div /> : null}
      </DiscoverLayout>
    </>
  );
}

DiscoverProductShowPage.loggedInUserLayout = true;
export default DiscoverProductShowPage;
