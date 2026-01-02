import React from "react";

import * as Products from "./Products";
import * as Variants from "./Variants";
import * as OfferCodes from "./OfferCodes";
import * as CustomFields from "./CustomFields";
import * as User from "./User";
import * as ResourceSubscriptions from "./ResourceSubscriptions";
import * as Sales from "./Sales";
import * as Subscribers from "./Subscribers";
import * as Licenses from "./Licenses";
import * as Payouts from "./Payouts";

export const API_RESOURCES = [
  {
    name: "Products",
    id: "products",
    endpoints: [
      <Products.GetProducts key="get-products" />,
      <Products.GetProduct key="get-product" />,
      <Products.DeleteProduct key="delete-product" />,
      <Products.EnableProduct key="enable-product" />,
      <Products.DisableProduct key="disable-product" />,
    ],
  },
  {
    name: "Variant categories",
    id: "variant-categories",
    endpoints: [
      <Variants.CreateVariantCategory key="create-variant-category" />,
      <Variants.GetVariantCategory key="get-variant-category" />,
      <Variants.UpdateVariantCategory key="update-variant-category" />,
      <Variants.DeleteVariantCategory key="delete-variant-category" />,
      <Variants.GetVariantCategories key="get-variant-categories" />,
      <Variants.CreateVariant key="create-variant" />,
      <Variants.GetVariant key="get-variant" />,
      <Variants.UpdateVariant key="update-variant" />,
      <Variants.DeleteVariant key="delete-variant" />,
      <Variants.GetVariants key="get-variants" />,
    ],
  },
  {
    name: "Offer codes",
    id: "offer-codes",
    endpoints: [
      <OfferCodes.GetOfferCodes key="get-offer-codes" />,
      <OfferCodes.GetOfferCode key="get-offer-code" />,
      <OfferCodes.CreateOfferCode key="create-offer-code" />,
      <OfferCodes.UpdateOfferCode key="update-offer-code" />,
      <OfferCodes.DeleteOfferCode key="delete-offer-code" />,
    ],
  },
  {
    name: "Custom fields",
    id: "custom-fields",
    endpoints: [
      <CustomFields.GetCustomFields key="get-custom-fields" />,
      <CustomFields.CreateCustomField key="create-custom-field" />,
      <CustomFields.UpdateCustomField key="update-custom-field" />,
      <CustomFields.DeleteCustomField key="delete-custom-field" />,
    ],
  },
  {
    name: "User",
    id: "user",
    endpoints: [<User.GetUser key="get-user" />],
  },
  {
    name: "Resource subscriptions",
    id: "resource-subscriptions",
    endpoints: [
      <ResourceSubscriptions.CreateResourceSubscription key="create-resource-subscription" />,
      <ResourceSubscriptions.GetResourceSubscriptions key="get-resource-subscriptions" />,
      <ResourceSubscriptions.DeleteResourceSubscription key="delete-resource-subscription" />,
    ],
  },
  {
    name: "Sales",
    id: "sales",
    endpoints: [
      <Sales.GetSales key="get-sales" />,
      <Sales.GetSale key="get-sale" />,
      <Sales.MarkSaleAsShipped key="mark-sale-as-shipped" />,
      <Sales.RefundSale key="refund-sale" />,
      <Sales.ResendReceipt key="resend-receipt" />,
    ],
  },
  {
    name: "Subscribers",
    id: "subscribers",
    endpoints: [
      <Subscribers.GetSubscribers key="get-subscribers" />,
      <Subscribers.GetSubscriber key="get-subscriber" />,
    ],
  },
  {
    name: "Licenses",
    id: "licenses",
    endpoints: [
      <Licenses.VerifyLicense key="verify-license" />,
      <Licenses.EnableLicense key="enable-license" />,
      <Licenses.DisableLicense key="disable-license" />,
      <Licenses.DecrementUsesCount key="decrement-uses-count" />,
      <Licenses.RotateLicense key="rotate-license" />,
    ],
  },
  {
    name: "Payouts",
    id: "payouts",
    endpoints: [<Payouts.GetPayouts key="get-payouts" />, <Payouts.GetPayout key="get-payout" />],
  },
];
