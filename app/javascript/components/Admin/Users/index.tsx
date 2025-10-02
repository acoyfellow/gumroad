import React from "react";
import { usePage, WhenVisible } from "@inertiajs/react";
import User, { type User as UserType } from "$app/components/Admin/Users/User";
import EmptyState from "$app/components/Admin/EmptyState";
import { type Pagination } from "$app/hooks/useLazyFetch";
import Loading from "$app/components/Admin/Loading";

type PageProps = {
  users: UserType[];
  pagination: Pagination;
};

type Props = {
  is_affiliate_user?: boolean;
};

const AdminUsers = ({
  is_affiliate_user = false
}: Props) => {
  const { pagination, users } = usePage().props as unknown as PageProps;

  const RenderNextUsersWhenVisible = () => {
    const usersLengthFromCurrentPage = users.length / pagination.page;

    if (usersLengthFromCurrentPage >= pagination.limit) {
      const params = {
        data: { page: pagination.page + 1 },
        only: ["users", "pagination"],
        preserveScroll: true
      }

      return <WhenVisible fallback={<Loading />} params={params} children />;
    }
  };

  return (
    <div className="paragraphs">
      {users.map(user => <User key={user.id} user={user} is_affiliate_user={is_affiliate_user} />)}
      {pagination.page === 1 && users.length === 0 && (
        <EmptyState message="No users found." />
      )}
      <RenderNextUsersWhenVisible />
    </div>
  );
};

export default AdminUsers;
