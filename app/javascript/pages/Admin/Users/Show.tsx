import { usePage } from "@inertiajs/react";
import React from "react";

import AdminUserAndProductsTabs from "$app/components/Admin/UserAndProductsTabs";
import User, { type User as UserType } from "$app/components/Admin/Users/User";

type PageProps = {
  user: UserType;
};

type Props = {
  isAffiliateUser?: boolean;
};

const AdminUsersShow = ({ isAffiliateUser = false }: Props) => {
  const { user } = usePage<PageProps>().props;

  return (
    <div className="paragraphs">
      <AdminUserAndProductsTabs selectedTab="users" userId={user.id} />
      <User user={user} isAffiliateUser={isAffiliateUser} />
    </div>
  );
};

export default AdminUsersShow;
