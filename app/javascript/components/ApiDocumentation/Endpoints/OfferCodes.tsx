import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";
import { ApiParameter, ApiParameters } from "../ApiParameters";

export const GetOfferCodes: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/products/:product_id/offer_codes"
    description="Retrieve all of the existing offer codes for a product. Either amount_cents or percent_off will be returned depending if the offer code is a fixed amount off or a percentage off. A universal offer code is one that applies to all products."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/offer_codes \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "offer_codes": [...]
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const GetOfferCode: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/products/:product_id/offer_codes/:id"
    description="Retrieve the details of a specific offer code of a product"
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/offer_codes/bfi_30HLgGWL8H2wo_Gzlg== \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "name=1OFF" \\
  -d "amount_cents=100" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "offer_code": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const CreateOfferCode: React.FC = () => (
  <ApiEndpoint
    method="post"
    path="/products/:product_id/offer_codes"
    description="Create a new offer code for a product. Default offer code is in cents. A universal offer code is one that applies to all products."
  >
    <ApiParameters>
      <ApiParameter name="name" required>
        the coupon code used at checkout
      </ApiParameter>
      <br />
      <ApiParameter name="amount_off" required />
      <br />
      <ApiParameter name="offer_type">optional, "cents" or "percent") Default: "cents"</ApiParameter>
      <br />
      <ApiParameter name="max_purchase_count">optional</ApiParameter>
      <br />
      <ApiParameter name="universal">optional, true or false) Default: false</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/offer_codes \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "name=1OFF" \\
  -d "amount_off=100" \\
  -d "offer_type=cents" \\
  -X POST`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "offer_code": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const UpdateOfferCode: React.FC = () => (
  <ApiEndpoint
    method="put"
    path="/products/:product_id/offer_codes/:id"
    description="Edit an existing product's offer code."
  >
    <ApiParameters>
      <ApiParameter name="name">the coupon code used at checkout</ApiParameter>
      <br />
      <ApiParameter name="amount_off" />
      <br />
      <ApiParameter name="offer_type">optional, "cents" or "percent"</ApiParameter>
      <br />
      <ApiParameter name="max_purchase_count">optional</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/offer_codes/bfi_30HLgGWL8H2wo_Gzlg== \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "max_purchase_count=10" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "offer_code": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const DeleteOfferCode: React.FC = () => (
  <ApiEndpoint
    method="delete"
    path="/products/:product_id/offer_codes/:id"
    description="Permanently delete a product's offer code."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/offer_codes/bfi_30HLgGWL8H2wo_Gzlg== \\
  -d "access_token=ACCESS_TOKEN" \\
  -X DELETE`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "message": "Offer code deleted"
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
