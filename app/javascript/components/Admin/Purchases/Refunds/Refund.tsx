import React from "react";
import { Link } from "@inertiajs/react";
import { capitalize } from "lodash";
import { type Refund } from "$app/components/Admin/Purchases/Purchase";
import DateTimeWithRelativeTooltip from "$app/components/Admin/DateTimeWithRelativeTooltip";

type Props = {
  refund: Refund;
};

const AdminPurchasesRefund = ({ refund }: Props) => {
  const userName = refund.user?.name && refund.user.name.length > 0 ? refund.user.name : `User ${refund.user?.id}`;

  return (
    <>
      <li>
        Refunder:
        {refund.user ? <Link href={Routes.admin_user_path(refund.user.id)}>{userName}</Link> : "(unknown)"}
      </li>

      <li>
        Refund Status:
        {capitalize(refund.status)}
      </li>

      <li>
        Date of refund:
        <DateTimeWithRelativeTooltip date={refund.created_at} />
      </li>
    </>
  );
};

export default AdminPurchasesRefund;
