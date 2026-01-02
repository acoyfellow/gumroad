import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";
import { ApiParameter, ApiParameters } from "../ApiParameters";

export const GetCustomFields: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/products/:product_id/custom_fields"
    description="Retrieve all of the existing custom fields for a product."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/custom_fields \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "custom_fields": [...]
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const CreateCustomField: React.FC = () => (
  <ApiEndpoint
    method="post"
    path="/products/:product_id/custom_fields"
    description="Create a new custom field for a product."
  >
    <ApiParameters>
      <ApiParameter name="name" required />
      <br />
      <ApiParameter name="required">optional, true or false</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/custom_fields \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "name=phone number" \\
  -d "required=true" \\
  -X POST`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "custom_field": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const UpdateCustomField: React.FC = () => (
  <ApiEndpoint
    method="put"
    path="/products/:product_id/custom_fields/:name"
    description="Edit an existing product's custom field."
  >
    <ApiParameters>
      <ApiParameter name="required">optional, true or false</ApiParameter>
    </ApiParameters>
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/custom_fields/phone%20number \\
  -d "access_token=ACCESS_TOKEN" \\
  -d "required=false" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "custom_field": {...}
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const DeleteCustomField: React.FC = () => (
  <ApiEndpoint
    method="delete"
    path="/products/:product_id/custom_fields/:name"
    description="Permanently delete a product's custom field."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/custom_fields/phone%20number \\
  -d "access_token=ACCESS_TOKEN" \\
  -X DELETE`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "message": "Custom field deleted"
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
