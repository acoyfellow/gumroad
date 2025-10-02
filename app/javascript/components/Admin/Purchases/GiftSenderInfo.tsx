import React from "react";
import { Link } from "@inertiajs/react";
import { type Gift } from "$app/components/Admin/Purchases/Purchase";

type Props = {
  gift: Gift;
};

const AdminPurchasesGiftSenderInfo = ({
  gift: {
    giftee_email,
    gift_note,
    giftee_purchase_id,
  },
}: Props) => (
  <details>
    <summary>
      <h3>Gift Sender Info</h3>
    </summary>
    <dl>
      <dt>For</dt>
      <dd>{giftee_email}</dd>

      <dt>Note</dt>
      <dd>{gift_note}</dd>

      <dt>Receiver purchase id</dt>
      <dd>
        <Link href={Routes.admin_purchase_path(giftee_purchase_id)}>
          {giftee_purchase_id}
        </Link>
      </dd>
    </dl>
  </details>
)

export default AdminPurchasesGiftSenderInfo;
