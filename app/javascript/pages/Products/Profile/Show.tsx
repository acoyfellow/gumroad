import { usePage } from "@inertiajs/react";

import { CreatorProfile } from "$app/parsers/profile";

import { Layout as ProductLayout, Props } from "$app/components/Product/Layout";
import { Layout as ProfileLayout } from "$app/components/Profile/Layout";

type PageProps = Props & {
  creator_profile: CreatorProfile;
  custom_styles: string;
};

function ProfileProductShowPage() {
  const props = usePage<PageProps>().props;

  return (
    <>
      <style>{props.custom_styles}</style>
      <ProfileLayout creatorProfile={props.creator_profile}>
        <ProductLayout cart {...props} />
      </ProfileLayout>
    </>
  );
}

ProfileProductShowPage.loggedInUserLayout = true;
export default ProfileProductShowPage;
