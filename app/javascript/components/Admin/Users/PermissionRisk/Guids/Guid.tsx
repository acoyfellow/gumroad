import React from "react";
import { Link } from "@inertiajs/react";

type GuidProps = {
  guid: string;
  user_ids: number[];
};

const Guid = ({ guid, user_ids }: GuidProps) => (
  <div>
    <h5>
      <Link href={Routes.admin_guid_users_path(guid)}>{guid}</Link>
    </h5>
    <span>{user_ids.length} users</span>
  </div>
);

export default Guid;
