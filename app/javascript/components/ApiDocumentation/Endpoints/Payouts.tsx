import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";
import { ApiParameter, ApiParameters } from "../ApiParameters";

export const GetPayouts: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/payouts"
    description="Retrieves all of the payouts for the authenticated user. Available with the 'view_payouts' scope."
  >
    <ApiParameters>
      <ApiParameter name="page">optional, page number (default 1)</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/payouts \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "payouts": [...]
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const GetPayout: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/payouts/:id"
    description="Retrieves the details of a specific payout by this user. Available with the 'view_payouts' scope."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/payouts/payout_id \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "payout": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
