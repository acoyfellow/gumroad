import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";

export const GetProducts: React.FC = () => (
  <ApiEndpoint
    method="get"
    path="/products"
    description="Retrieve all of the existing products for the authenticated user."
  >
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "products": [
    {
      "name": "Example Product",
      "url": "https://gum.co/demo",
      ...
    }
  ]
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const GetProduct: React.FC = () => (
  <ApiEndpoint method="get" path="/products/:id" description="Retrieve the details of a product.">
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA== \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "product": {
    "name": "Example Product",
    "url": "https://gum.co/demo",
    ...
  }
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const DeleteProduct: React.FC = () => (
  <ApiEndpoint method="delete" path="/products/:id" description="Permanently delete a product.">
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA== \\
  -d "access_token=ACCESS_TOKEN" \\
  -X DELETE`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "message": "Product deleted"
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const EnableProduct: React.FC = () => (
  <ApiEndpoint method="put" path="/products/:id/enable" description="Enable an existing product.">
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/enable \\
  -d "access_token=ACCESS_TOKEN" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "product": {
    "name": "Example Product",
    "published": true,
    ...
  }
}`}
    </CodeSnippet>
  </ApiEndpoint>
);

export const DisableProduct: React.FC = () => (
  <ApiEndpoint method="put" path="/products/:id/disable" description="Disable an existing product.">
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/products/A-m3CDDC5dlrSdKZp0RFhA==/disable \\
  -d "access_token=ACCESS_TOKEN" \\
  -X PUT`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "product": {
    "name": "Example Product",
    "published": false,
    ...
  }
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
