import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { Profile, type Props as ProfilePageProps } from "$app/components/Profile";
import { type Props as EditPageProps } from "$app/components/Profile/EditPage";

type Props = ProfilePageProps | EditPageProps;

export default function UserShowPage() {
  const props = cast<Props>(usePage().props);

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      <Profile {...props} />
    </div>
  );
}

UserShowPage.loggedInUserLayout = true;
