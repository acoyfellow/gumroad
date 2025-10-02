import React from "react";
import { Link } from "@inertiajs/react";
import { type Gift } from "$app/components/Admin/Purchases/Purchase";

type Props = {
  gift: Gift;
};

const AdminPurchasesGiftReceiverInfo = ({
  gift: {
    gifter_email,
    gift_note,
    gifter_purchase_id,
  },
}: Props) => (
  <details>
    <summary>
      <h3>Gift Receiver Info</h3>
    </summary>
    <dl>
      <dt>For</dt>
      <dd>{gifter_email}</dd>

      <dt>Note</dt>
      <dd>{gift_note}</dd>

      <dt>Receiver purchase id</dt>
      <dd>
        <Link href={Routes.admin_purchase_path(gifter_purchase_id)}>
          {gifter_purchase_id}
        </Link>
      </dd>
    </dl>
  </details>
)

export default AdminPurchasesGiftReceiverInfo;
