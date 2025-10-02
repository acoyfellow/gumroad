import React from "react";

import type { Product } from "$app/components/Admin/Products/Product";
import AdminCommentableComments from "$app/components/Admin/Commentable";

type AdminProductCommentsProps = {
  product: Product;
};

const AdminProductComments = ({ product }: AdminProductCommentsProps) => {
  return (
    <AdminCommentableComments
      endpoint={Routes.admin_product_comments_path(product.id, { format: "json" })}
      commentableType="product"
    />
  )
};

export default AdminProductComments;
