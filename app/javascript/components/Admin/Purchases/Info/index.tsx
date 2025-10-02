import React from "react";
import { Link } from "@inertiajs/react";
import { capitalize } from "lodash";

import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { BooleanIcon, Icon } from "$app/components/Icons";
import AdminPurchasesState from "$app/components/Admin/Purchases/State";
import AdminPurchasesRefunds from "$app/components/Admin/Purchases/Refunds";
import AdminPurchaseInfoCard from "$app/components/Admin/Purchases/Info/Card";
import AdminPurchaseInfoEmailInfo from "$app/components/Admin/Purchases/Info/EmailInfo";
import AdminPurchaseInfoProductPurchases from "$app/components/Admin/Purchases/Info/ProductPurchases";
import AdminPurchaseInfoUrlRedirect from "$app/components/Admin/Purchases/Info/UrlRedirect";
import AdminPurchasesRefundPolicy from "$app/components/Admin/Purchases/RefundPolicy";

import { AdminActionButton } from "$app/components/Admin/ActionButton";

type Props = {
  purchase: Purchase;
};

const AdminPurchasesInfo = ({ purchase }: Props) => {
  return (
    <div className="paragraphs">
      <h3>Info</h3>
      <dl>
        {
          purchase.seller.support_email && purchase.seller.support_email.length > 0 && (
            <>
              <dt>Seller support email</dt>
              <dd>
                <CopyToClipboard text={purchase.seller.support_email}>
                  <Icon name="outline-duplicate" />
                </CopyToClipboard>
              </dd>
            </>
          )
        }

        <dt>Seller email</dt>
        <dd>
          <CopyToClipboard text={purchase.seller.email}>
            <Icon name="outline-duplicate" />
          </CopyToClipboard>
        </dd>

        {
          purchase.merchant_account && (
            <>
              <dt>Merchant account</dt>
              <dd>
                <Link href={Routes.admin_merchant_account_path(purchase.merchant_account.id)}>
                  {purchase.merchant_account.id} – {capitalize(purchase.merchant_account.charge_processor_id || "")}
                </Link>
              </dd>

              <dt>Funds held by</dt>
              <dd>{capitalize(purchase.merchant_account.holder_of_funds || "")}</dd>
            </>
          )
        }

        <dt>Fee</dt>
        <dd>{purchase.formatted_fee_cents}</dd>

        {
          purchase.tip && (
            <>
              <dt>Tip</dt>
              <dd>{purchase.tip.formatted_value_usd_cents}</dd>
            </>
          )
        }

        {
          purchase.tax_cents > 0 && (
            <>
              <dt>Seller Tax</dt>
              <dd>{purchase.formatted_seller_tax_amount}</dd>
            </>
          )
        }

        {
          purchase.gumroad_tax_cents > 0 && (
            <>
              <dt>Gumroad Collected Tax</dt>
              <dd>{purchase.formatted_gumroad_tax_amount}</dd>
            </>
          )
        }

        {
          purchase.shipping_cents > 0 && (
            <>
              <dt>Shipping Cost</dt>
              <dd>{purchase.formatted_shipping_amount}</dd>
            </>
          )
        }

        {
          purchase.affiliate && (
            <>
              <dt>Affiliate</dt>
              <dd>{purchase.formatted_affiliate_credit_amount}</dd>
            </>
          )
        }

        <dt>Transaction Total</dt>
        <dd>{purchase.formatted_total_transaction_amount}</dd>

        <dt>{capitalize(purchase.charge_processor_id || "")} transaction ID</dt>
        <dd>
          {
            purchase.charge_transaction_url && (
              <a href={purchase.charge_transaction_url} target="_blank">
                {purchase.stripe_transaction_id}
              </a>
            )
          }
          {" | "}
          <Link href={Routes.admin_purchase_path(purchase.id)}>
            {purchase.id}
          </Link>
        </dd>

        <dt>Order number</dt>
        <dd>{purchase.external_id_numeric}</dd>

        {
          purchase.quantity > 1 && (
            <>
              <dt>Quantity</dt>
              <dd>{purchase.quantity}</dd>
            </>
          )
        }

        <dt>Status</dt>
        <dd>
          <AdminPurchasesState purchase={purchase} />
        </dd>

        {
          purchase.refunds.length > 0 && (
            <>
              <dt>Refunds</dt>
              <dd>
                <AdminPurchasesRefunds purchase={purchase} />
              </dd>
            </>
          )
        }

        {
          purchase.card_type && purchase.card_type.length > 0 && purchase.card_visual && purchase.card_visual.length > 0 && (
            <>
              <dt>Card</dt>
              <dd>
                <AdminPurchaseInfoCard
                  card_type={purchase.card_type}
                  card_visual={purchase.card_visual}
                  stripe_fingerprint={purchase.stripe_fingerprint || ""}
                  is_stripe_charge_processor={purchase.is_stripe_charge_processor}
                  card_country={purchase.card_country || ""}
                />
              </dd>
            </>
          )
        }

        {
          purchase.ip_address && purchase.ip_address.length > 0 && (
            <>
              <dt>IP Address</dt>
              <dd><Link href={Routes.admin_search_purchases_path({ query: purchase.ip_address })}>{purchase.ip_address}</Link></dd>

              <dt>IP Country</dt>
              <dd>{purchase.ip_country}</dd>
            </>
          )
        }

        {
          purchase.is_preorder_authorization ? (
            <>
              <dt>Pre-order Receipt</dt>
              <dd>
                <AdminPurchaseInfoEmailInfo
                  email_infos={purchase.email_infos}
                  email_name="preorder_receipt"
                />
              </dd>
            </>
          ) : (
            <>
              <dt>Receipt</dt>
              <dd>
                <AdminPurchaseInfoEmailInfo
                  email_infos={purchase.email_infos}
                  email_name="receipt"
                />
              </dd>
            </>
          )
        }

      {
        purchase.is_bundle_purchase ? (
          <>
            <dt>Bundle</dt>
            <dd>
              <AdminPurchaseInfoProductPurchases product_purchases={purchase.product_purchases} />
            </dd>
          </>
        ) : purchase.url_redirect ? (
          <>
            <dt>URL redirect</dt>
            <dd>
              <AdminPurchaseInfoUrlRedirect url_redirect={purchase.url_redirect} />
            </dd>
          </>
        ) : null
      }

      {
        purchase.subscription && (
          <>
            <dt>Manage Membership URL</dt>
            <dd>
              <Link href={Routes.manage_subscription_url(purchase.subscription.external_id)} target="_blank">
                {purchase.subscription.external_id}
              </Link>
            </dd>
          </>
        )
      }

      {
        purchase.offer_code && !purchase.is_gift_sender_purchase && (
          <>
            <dt>Discount code</dt>
            <dd>{purchase.offer_code.code} for {purchase.offer_code.displayed_amount_off} off</dd>
          </>
        )
      }

      {
        purchase.street_address && (
          <>
            <dt>Shipping</dt>
            <dd>{purchase.full_name} {purchase.street_address} {purchase.city}, {purchase.state} {purchase.zip_code} {purchase.country}</dd>
          </>
        )
      }

      {
        purchase.purchase_custom_fields.length > 0 && (
          <>
            {purchase.purchase_custom_fields.map((field: any) => (
              <React.Fragment key={field.name}>
                <dt>{field.name}</dt>
                <dd>{field.value} (custom field)</dd>
              </React.Fragment>
            ))}
          </>
        )
      }

      {
        purchase.purchase_state == "preorder_authorization_successful" && (
          <>
            <dt>Cancel Pre-order</dt>
            <dd>
              <AdminActionButton
                label="Cancel Pre-order"
                url={Routes.cancel_preorder_by_seller_path(purchase.external_id)}
                loading="Canceling..."
                done="Cancelled!"
                confirm_message="Are you sure you want to cancel this preorder?"
                success_message="Cancelled!"
              />
            </dd>
          </>
        )
      }

      {
        purchase.subscription && (
          <>
            <dt>Cancelled</dt>
            <dd>
              <BooleanIcon value={!!purchase.subscription.cancelled_at} />
              {purchase.subscription.cancelled_at && (
                <span> (on {purchase.subscription.cancelled_at} by {purchase.subscription.cancelled_by_buyer ? 'buyer' : 'seller'})</span>
              )}
            </dd>

            <dt>Ended</dt>
            <dd>
              <BooleanIcon value={!!purchase.subscription.ended_at} />
              {purchase.subscription.ended_at && (
                <span> (on {purchase.subscription.ended_at})</span>
              )}
            </dd>

            <dt>Failed</dt>
            <dd>
              <BooleanIcon value={!!purchase.subscription.failed_at} />
              {purchase.subscription.failed_at && (
                <span> (on {purchase.subscription.failed_at})</span>
              )}
            </dd>
          </>
        )
      }

      {
        purchase.license && (
          <>
            <dt>License</dt>
            <dd>{purchase.license.serial}</dd>
          </>
        )
      }

      {
        purchase.affiliate && (
          <>
            <dt>Affiliate</dt>
            <dd><Link href={Routes.admin_search_users_path({ query: purchase.affiliate.affiliate_user.form_email })}>{purchase.affiliate.affiliate_user.form_email}</Link></dd>
          </>
        )
      }

      {
        purchase.purchase_refund_policy && (
          <>
            <dt>Refund Policy</dt>
            <dd>
              <strong>
                <AdminPurchasesRefundPolicy purchase={purchase} />
              </strong>
              {
                purchase.purchase_refund_policy.fine_print && (
                  <>
                    <br />
                    {purchase.purchase_refund_policy.fine_print}
                  </>
                )
              }
              {
                purchase.purchase_refund_policy.max_refund_period_in_days && (
                  <>
                    <br />
                    <small>Max refund period: {purchase.purchase_refund_policy.max_refund_period_in_days} days</small>
                  </>
                )
              }
            </dd>
          </>
        )
      }

      <dt>Can email</dt>
      <dd aria-label="Can email"><BooleanIcon value={purchase.can_contact} /></dd>

      {
        purchase.is_gift_sender_purchase && (
          <>
            <dt>Receiver purchase id</dt>
            <dd><Link href={Routes.admin_purchase_path(purchase.gift.giftee_purchase_id)}>{purchase.gift.giftee_purchase_id}</Link></dd>
          </>
        )
      }

      {
        purchase.is_gift_receiver_purchase && (
          <>
            <dt>Sender purchase id</dt>
            <dd><Link href={Routes.admin_purchase_path(purchase.gift.gifter_purchase_id)}>{purchase.gift.gifter_purchase_id}</Link></dd>
          </>
        )
      }
      </dl>
    </div>
  );
};

export default AdminPurchasesInfo;
