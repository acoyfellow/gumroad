import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";
import { ApiParameter, ApiParameters } from "../ApiParameters";

export const VerifyLicense: React.FC = () => (
  <ApiEndpoint method="post" path="/licenses/verify" description="Verify a license">
    <ApiParameters>
      <ApiParameter name="product_id" required />
      <br />
      <ApiParameter name="license_key" required />
      <br />
      <ApiParameter name="increment_uses_count">optional, true or false</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/licenses/verify \\
  -d "product_id=product_id" \\
  -d "license_key=license_key" \\
  -X POST`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "uses": 0,
  "purchase": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const EnableLicense: React.FC = () => (
  <ApiEndpoint method="put" path="/licenses/enable" description="Enable a license">
    <ApiParameters>
      <ApiParameter name="product_id" required />
      <br />
      <ApiParameter name="license_key" required />
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/licenses/enable \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "product_id=product_id" \\
  -d "license_key=license_key" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "purchase": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const DisableLicense: React.FC = () => (
  <ApiEndpoint method="put" path="/licenses/disable" description="Disable a license">
    <ApiParameters>
      <ApiParameter name="product_id" required />
      <br />
      <ApiParameter name="license_key" required />
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/licenses/disable \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "product_id=product_id" \\
  -d "license_key=license_key" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "purchase": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const DecrementUsesCount: React.FC = () => (
  <ApiEndpoint method="put" path="/licenses/decrement_uses_count" description="Decrement the uses count of a license">
    <ApiParameters>
      <ApiParameter name="product_id" required />
      <br />
      <ApiParameter name="license_key" required />
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/licenses/decrement_uses_count \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "product_id=product_id" \\
  -d "license_key=license_key" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "purchase": {...},
  "uses": 0
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const RotateLicense: React.FC = () => (
  <ApiEndpoint
    method="put"
    path="/licenses/rotate"
    description="Rotate a license key. The old license key will no longer be valid."
  >
    <ApiParameters>
      <ApiParameter name="product_id" required />
      <br />
      <ApiParameter name="license_key" required />
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/licenses/rotate \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "product_id=product_id" \\
  -d "license_key=license_key" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "purchase": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
