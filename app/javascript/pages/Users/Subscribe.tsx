import * as React from "react";
import { usePage } from "@inertiajs/react";
import { createCast } from "ts-safe-cast";

import { CreatorProfile } from "$app/parsers/profile";
import { FollowFormBlock } from "$app/components/Profile/FollowForm";
import { Layout } from "$app/components/Profile/Layout";

type Props = {
  creator_profile: CreatorProfile;
};

export default function Subscribe() {
  const { props } = usePage();
  const { creator_profile } = createCast<Props>()(props);

  return (
    <Layout hideFollowForm creatorProfile={creator_profile}>
      <FollowFormBlock creatorProfile={creator_profile} className="px-4" />
    </Layout>
  );
}
