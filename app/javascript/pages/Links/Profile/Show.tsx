import { Head, usePage } from "@inertiajs/react";
import * as React from "react";

import { CreatorProfile } from "$app/parsers/profile";

import { Layout as ProductLayout, Props } from "$app/components/Product/Layout";
import { Layout as ProfileLayout } from "$app/components/Profile/Layout";
import Alert from "$app/components/server-components/Alert";

type PageProps = Props & {
  creator_profile: CreatorProfile;
  canonical_url: string;
  structured_data: Record<string, unknown>[];
};

function ProfileProductShowPage() {
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
      <ProfileLayout creatorProfile={props.creator_profile}>
        <ProductLayout cart {...props} />
      </ProfileLayout>
    </>
  );
}

ProfileProductShowPage.disableLayout = true;
export default ProfileProductShowPage;
