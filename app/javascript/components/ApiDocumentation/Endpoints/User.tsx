import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";

import { ApiEndpoint } from "../ApiEndpoint";

export const GetUser: React.FC = () => (
  <ApiEndpoint method="get" path="/user" description="Retrieve the user's data.">
    <CodeSnippet caption="cURL example">
      {`curl https://api.gumroad.com/v2/user \\
  -d "access_token=ACCESS_TOKEN" \\
  -X GET`}
    </CodeSnippet>
    <CodeSnippet caption="Example response:">
      {`{
  "success": true,
  "user": {
    "bio": "...",
    "name": "...",
    ...
  }
}`}
    </CodeSnippet>
  </ApiEndpoint>
);
