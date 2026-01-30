import * as React from "react";

import { Profile } from "$app/components/server-components/Profile";

type PageProps = React.ComponentProps<typeof Profile>;

function ProfileShow(props: PageProps) {
  return <Profile {...props} />;
}

ProfileShow.authenticationLayout = true;

export default ProfileShow;
