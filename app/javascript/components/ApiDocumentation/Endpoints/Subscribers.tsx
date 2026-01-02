import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";
import { ApiParameter, ApiParameters } from "../ApiParameters";

export const GetSubscribers: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/products/:product_id/subscribers"
    description="Retrieves all of the active subscribers for one of the authenticated user's products. Available with the 'view_sales' scope"
  >
    <ApiParameters>
      <ApiParameter name="email">optional, filter by customer email</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/product_id/subscribers \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "subscribers": [...]
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const GetSubscriber: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/subscribers/:id"
    description="Retrieves the details of a subscriber to this user's product. Available with the 'view_sales' scope."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/subscribers/subscriber_id \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "subscriber": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
