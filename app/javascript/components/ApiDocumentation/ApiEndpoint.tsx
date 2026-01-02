import React from "react";

import CodeSnippet from "$app/components/ui/CodeSnippet";
import { Pill } from "$app/components/ui/Pill";

type ApiEndpointProps = {
  method: string;
  path: string;
  description: React.ReactNode;
  isOAuth?: boolean;
  children?: React.ReactNode;
};

export const ApiEndpoint: React.FC<ApiEndpointProps> = ({ method, path, description, isOAuth, children }) => {
  const methodId = `${method}-${path}`;
  const url = isOAuth ? `https://gumroad.com${path}` : `https://api.gumroad.com/v2${path}`;

  return (
    <div id={methodId}>
      <div className="flex flex-col gap-4">
        <div role="heading" aria-level={3} className="flex items-center gap-2">
          <Pill color="primary">{method.toUpperCase()}</Pill>
          <span>{path}</span>
        </div>
        {typeof description === "string" ? (
          <div dangerouslySetInnerHTML={{ __html: description }} />
        ) : (
          <div>{description}</div>
        )}
        <CodeSnippet>{url}</CodeSnippet>
        {children}
      </div>
    </div>
  );
};
