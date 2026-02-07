import { usePage } from "@inertiajs/react";
import * as React from "react";

import { type CreatorProfile } from "$app/parsers/profile";

import { FollowFormBlock } from "$app/components/Profile/FollowForm";
import { Layout } from "$app/components/Profile/Layout";

type Props = {
  creator_profile: CreatorProfile;
};

export default function SubscribePage() {
  const { creator_profile } = usePage<Props>().props;

  return (
    <Layout hideFollowForm creatorProfile={creator_profile}>
      <FollowFormBlock creatorProfile={creator_profile} className="px-4" />
    </Layout>
  );
}
SubscribePage.loggedInUserLayout = true;
