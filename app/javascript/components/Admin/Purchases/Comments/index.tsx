import React from "react";

import type { Purchase } from "$app/components/Admin/Purchases/Purchase";
import AdminCommentableComments from "$app/components/Admin/Commentable";

type AdminPurchaseCommentsProps = {
  purchase: Purchase;
};

const AdminPurchaseComments = ({ purchase }: AdminPurchaseCommentsProps) => {
  return (
    <AdminCommentableComments
      endpoint={Routes.admin_purchase_comments_path(purchase.id, { format: "json" })}
      commentableType="purchase"
    />
  )
};

export default AdminPurchaseComments;
