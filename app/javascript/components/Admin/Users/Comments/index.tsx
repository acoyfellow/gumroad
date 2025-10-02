import React from "react";

import type { User } from "$app/components/Admin/Users/User";
import AdminCommentableComments from "$app/components/Admin/Commentable";

type AdminUserCommentsProps = {
  user: User;
};

const AdminUserComments = ({ user }: AdminUserCommentsProps) => {
  return (
    <AdminCommentableComments
      endpoint={Routes.admin_user_comments_path(user.id, { format: "json" })}
      commentableType="user"
    />
  )
};

export default AdminUserComments;
