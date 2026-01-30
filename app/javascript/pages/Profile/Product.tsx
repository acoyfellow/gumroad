import * as React from "react";

import { usePage } from "@inertiajs/react";
import { createCast } from "ts-safe-cast";

import { Layout as ProductLayout, Props as ProductLayoutProps } from "$app/components/Product/Layout";
import { Layout as ProfileLayout } from "$app/components/Profile/Layout";
import { CreatorProfile } from "$app/parsers/profile";

type PageProps = ProductLayoutProps & { creator_profile: CreatorProfile };

function ProfileProduct(props: PageProps) {
  const { creator_profile, ...productProps } = props;
  return (
    <ProfileLayout creatorProfile={creator_profile} useInertiaForm>
      <ProductLayout cart {...(productProps as ProductLayoutProps)} />
    </ProfileLayout>
  );
}

function ProfileProductPage() {
  const props = createCast<PageProps>()(usePage().props);
  return <ProfileProduct {...props} />;
}

ProfileProductPage.authenticationLayout = true;

export default ProfileProductPage;
