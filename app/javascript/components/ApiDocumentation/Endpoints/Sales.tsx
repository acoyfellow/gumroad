import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";
import { ApiParameter, ApiParameters } from "../ApiParameters";

export const GetSales: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/sales"
    description="Retrieves all of the successful sales by the authenticated user. Available with the 'view_sales' scope."
  >
    <ApiParameters>
      <ApiParameter name="after">optional, ISO8601 timestamp</ApiParameter>
      <br />
      <ApiParameter name="before">optional, ISO8601 timestamp</ApiParameter>
      <br />
      <ApiParameter name="page">optional, page number (default 1)</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/sales \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "sales": [...]
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const GetSale: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/sales/:id"
    description="Retrieves the details of a sale by this user. Available with the 'view_sales' scope."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/sales/sale_id \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "sale": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const MarkSaleAsShipped: React.FC = () => (
  <ApiEndpoint
    method="put"
    path="/sales/:id/mark_as_shipped"
    description="Marks a sale as shipped. Available with the 'mark_sales_as_shipped' scope."
  >
    <ApiParameters>
      <ApiParameter name="tracking_url">optional</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/sales/sale_id/mark_as_shipped \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "tracking_url=http://track.me" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "sale": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const RefundSale: React.FC = () => (
  <ApiEndpoint
    method="put"
    path="/sales/:id/refund"
    description="Refunds a sale. Available with the 'edit_sales' scope."
  >
    <ApiParameters>
      <ApiParameter name="amount_cents">optional, amount to refund in cents</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/sales/sale_id/refund \\
  -d "access_token=ACCESS_TOKEN" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "sale": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const ResendReceipt: React.FC = () => (
  <ApiEndpoint
    method="post"
    path="/sales/:id/resend_receipt"
    description="Resend the purchase receipt to the customer's email. Available with the 'edit_sales' scope."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/sales/sale_id/resend_receipt \\
  -d "access_token=ACCESS_TOKEN" \\
  -X POST`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "message": "Receipt resent"
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
