import * as React from "react";
import { Head, usePage } from "@inertiajs/react";

import { CreatorProfile } from "$app/parsers/profile";
import { FollowFormBlock } from "$app/components/Profile/FollowForm";
import { Layout } from "$app/components/Profile/Layout";

type Props = {
  creator_profile: CreatorProfile;
  custom_styles?: string;
};

export default function SubscribePage() {
  const props = usePage<Props>().props;

  return (
    <>
      {props.custom_styles ? (
        <Head>
          <style>{props.custom_styles}</style>
        </Head>
      ) : null}
      <Layout hideFollowForm creatorProfile={props.creator_profile}>
        <FollowFormBlock creatorProfile={props.creator_profile} className="px-4" />
      </Layout>
    </>
  );
}
SubscribePage.StandaloneLayout= true;
