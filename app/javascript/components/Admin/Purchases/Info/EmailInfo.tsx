import React from "react";
import { capitalize } from "lodash";
import { formatDate } from "$app/utils/date";

import { type EmailInfo } from "$app/components/Admin/Purchases/Purchase";

type Props = {
  email_infos: EmailInfo[],
  email_name: string,
}

const AdminPurchaseInfoEmailInfo = ({
  email_infos,
  email_name,
}: Props) => {
  const emailInfo = email_infos
    .filter(email_info => email_info.email_name === email_name)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return emailInfo ? (
    <div>
      <span>{capitalize(emailInfo.state || "")}</span>
      emailInfo.delivered_at && <span>{`(on ${formatDate(new Date(emailInfo.delivered_at))})`}</span>
      emailInfo.opened_at && <span>{`(on ${formatDate(new Date(emailInfo.opened_at))})`}</span>
    </div>
  ) : (
    <div>
      <span>No email info found</span>
    </div>
  );
};

export default AdminPurchaseInfoEmailInfo;
