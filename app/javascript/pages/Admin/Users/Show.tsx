import React from "react";
import { usePage } from '@inertiajs/react';
import User, { type User as UserType } from "$app/components/Admin/Users/User";
import AdminUserAndProductsTabs from "$app/components/Admin/UserAndProductsTabs";

type PageProps = {
  user: UserType;
};

type Props = {
  is_affiliate_user?: boolean;
};

const AdminUsersShow = ({ is_affiliate_user = false }: Props) => {
  const { user } = usePage().props as unknown as PageProps;

  return (
    <div className="paragraphs">
      <AdminUserAndProductsTabs selectedTab="users" user={user} />
      <User user={user} is_affiliate_user={is_affiliate_user} />
    </div>
  );
};

export default AdminUsersShow;
