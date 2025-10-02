import React from "react";
import { type UrlRedirect } from "$app/components/Admin/Purchases/Purchase";

const AdminPurchaseInfoUrlRedirect = ({
  url_redirect: {
    download_page_url,
    uses,
  }
}: {
  url_redirect: UrlRedirect
}) => {
  return (
    <a href={download_page_url} target="_blank" rel="noopener noreferrer">
      {download_page_url} ({uses} uses)
    </a>
  );
};

export default AdminPurchaseInfoUrlRedirect;
