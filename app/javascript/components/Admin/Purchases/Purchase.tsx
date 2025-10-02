import React from "react";

import AdminPurchasesHeader from "$app/components/Admin/Purchases/Header";
import AdminPurchasesCreator from "$app/components/Admin/Purchases/Creator";
import AdminPurchasesInfo from "$app/components/Admin/Purchases/Info";
import AdminPurchasesGiftSenderInfo from "$app/components/Admin/Purchases/GiftSenderInfo";
import AdminPurchasesEditGifteeEmail from "$app/components/Admin/Purchases/EditGifteeEmail";
import AdminPurchasesGiftReceiverInfo from "$app/components/Admin/Purchases/GiftReceiverInfo";
import AdminPurchasesResendReceiptForm from "$app/components/Admin/Purchases/ResendReceiptForm";
import AdminPurchasesActions from "$app/components/Admin/Purchases/Actions";
import AdminPurchasesComments from "$app/components/Admin/Purchases/Comments";
import AdminPurchasesFooter from "$app/components/Admin/Purchases/Footer";

type MerchantAccount = {
  id: number;
  charge_processor_id: string;
  holder_of_funds: string;
};

type Seller = {
  id: number;
  email: string;
  support_email: string;
};

export type PurchaseRefundPolicy = {
  id: number;
  title: string;
  max_refund_period_in_days: number;
  fine_print: string;
};

type ProductRefundPolicy = {
  id: number;
  title: string;
  max_refund_period_in_days: number;
};

type Product = {
  id: number;
  long_url: string;
  name: string;
  product_refund_policy?: ProductRefundPolicy;
};

type Tip = {
  id: number;
  formatted_value_usd_cents: string;
};

type Affiliate = {
  id: number;
  affiliate_user: {
    id: number;
    form_email: string;
  };
};

export type Refund = {
  id: number;
  user: {
    id: number;
    name: string;
  };
  status: string;
  created_at: string;
};

export type EmailInfo = {
  id: number;
  email_name: string;
  state: string;
  delivered_at: string;
  opened_at: string;
  created_at: string;
};

export type ProductPurchase = {
  id: number;
  url_redirect_id: number;
  url_redirect_external_id: string;
  uses: number;
  url_redirect: UrlRedirect;
  link: {
    id: number;
    name: string;
  };
};

export type UrlRedirect = {
  id: number;
  download_page_url: string;
  uses: number;
};

type Subscription = {
  id: number;
  external_id: string;
  cancelled_at: string;
  cancelled_by_buyer: boolean;
  cancelled_by_seller: boolean;
  ended_at: string;
  failed_at: string;
};

type OfferCode = {
  code: string;
  displayed_amount_off: string;
};

type PurchaseCustomField = {
  id: number;
  name: string;
  value: string;
  type: string;
};

type License = {
  serial: string;
};

export type Gift = {
  id: number;
  giftee_purchase_id: string;
  gifter_purchase_id: string;
  giftee_email: string;
  gifter_email: string;
  gift_note: string;
};

export interface Purchase {
  id: number;
  email: string;
  formatted_display_price: string;
  merchant_account?: MerchantAccount;
  formatted_fee_cents: string;
  link: Product;
  variants_list: string;
  purchase_states: string[];
  purchase_refund_policy?: PurchaseRefundPolicy;
  seller: Seller;
  failed: boolean;
  error_code: string;
  formatted_error_code: string;
  purchase_state: string;
  stripe_refunded: boolean;
  stripe_partially_refunded: boolean;
  chargedback_not_reversed: boolean;
  chargeback_reversed: boolean;
  tip?: Tip;
  tax_cents: number;
  formatted_seller_tax_amount: string;
  gumroad_tax_cents: number;
  formatted_gumroad_tax_amount: string;
  shipping_cents: number;
  formatted_shipping_amount: string;
  affiliate?: Affiliate;
  formatted_affiliate_credit_amount: string;
  formatted_total_transaction_amount: string;
  charge_processor_id: string;
  stripe_transaction_id: string;
  external_id: string;
  external_id_numeric: string;
  quantity: number;
  refunds: Refund[];
  card_type?: string;
  card_visual?: string;
  card_country?: string;
  ip_address: string;
  ip_country: string;
  is_preorder_authorization: boolean;
  is_bundle_purchase: boolean;
  is_stripe_charge_processor: boolean;
  stripe_fingerprint?: string;
  charge_transaction_url?: string;
  email_infos: EmailInfo[];
  product_purchases: ProductPurchase[];
  url_redirect: UrlRedirect;
  subscription: Subscription;
  offer_code: OfferCode;
  full_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  purchase_custom_fields: PurchaseCustomField[];
  license: License;
  can_contact: boolean;
  is_gift_sender_purchase: boolean;
  is_gift_receiver_purchase: boolean;
  gift: Gift;
  successful: boolean;
  preorder_authorization_successful: boolean;
  is_free_trial_purchase: boolean;
  can_force_update: boolean;
  buyer_blocked: boolean;
  is_deleted_by_buyer: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
};

type Props = {
  purchase: Purchase;
};

const AdminPurchasesPurchase = ({ purchase }: Props) => {
  return (
    <div className="card">
      <div className="grid gap-2">
        <h2 className="purchase-title">
          <AdminPurchasesHeader purchase={purchase} />
        </h2>

        <AdminPurchasesCreator purchase={purchase} />
      </div>

      <hr />

      <AdminPurchasesInfo purchase={purchase} />

      {
        purchase.is_gift_sender_purchase && (
          <>
            <AdminPurchasesGiftSenderInfo gift={purchase.gift} />
            <AdminPurchasesEditGifteeEmail purchase={purchase} />
          </>
        )
      }

      {
        purchase.is_gift_receiver_purchase && (
          <>
            <AdminPurchasesGiftReceiverInfo gift={purchase.gift} />
          </>
        )
      }

      {
        purchase.successful || purchase.preorder_authorization_successful || purchase.is_free_trial_purchase && (
          <>
            <hr />
            <details>
              <summary>
                <h3>Resend receipt</h3>
              </summary>
              <AdminPurchasesResendReceiptForm purchase={purchase} />
            </details>
          </>
        )
      }

      <hr />
      <div className="button-group">
        <AdminPurchasesActions purchase={purchase} />
      </div>

      <AdminPurchasesComments purchase={purchase} />

      <hr />
      <AdminPurchasesFooter purchase={purchase} />
    </div>
  );
}

export default AdminPurchasesPurchase;
