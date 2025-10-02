import React from "react";
import { Link } from "@inertiajs/react";

interface CardInfoProps {
  card_type: string;
  card_visual: string;
  stripe_fingerprint: string;
  is_stripe_charge_processor: boolean;
  card_country: string;
}

const AdminPurchaseInfoCard = ({
  card_type,
  card_visual,
  stripe_fingerprint,
  is_stripe_charge_processor,
  card_country
}: CardInfoProps) => {
  return (
    <div>
      <Link
        href={Routes.admin_search_purchases_path({ query: stripe_fingerprint })}
        className="inline-flex items-center space-x-1"
      >
        <span>{card_type.toUpperCase()}</span>
        <span>*#{card_visual.replace("*", "").replace(" ", "")}</span>
        <span>{card_country}</span>
      </Link>
      {
        is_stripe_charge_processor && stripe_fingerprint && stripe_fingerprint.length > 0 && (
          <Link href={Routes.admin_search_purchases_path({ query: stripe_fingerprint })}>
            {stripe_fingerprint}
          </Link>
        )
      }
    </div>
  );
};

export default AdminPurchaseInfoCard;
