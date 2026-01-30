import * as React from "react";

import { CreatorProfile } from "$app/parsers/profile";

import { FollowFormBlock } from "$app/components/Profile/FollowForm";
import { Layout } from "$app/components/Profile/Layout";

type PageProps = {
  creator_profile: CreatorProfile;
};

function ProfileSubscribe({ creator_profile }: PageProps) {
  return (
    <Layout hideFollowForm creatorProfile={creator_profile}>
      <FollowFormBlock creatorProfile={creator_profile} className="px-4" useInertiaForm />
    </Layout>
  );
}

ProfileSubscribe.authenticationLayout = true;

export default ProfileSubscribe;
