import React from "react";

import { API_SCOPES } from "$app/data/apiDocumentation";

export const Scopes: React.FC = () => {
  return (
    <div className="stack" id="api-scopes">
      <div>
        <h2>Scopes</h2>
      </div>
      <div>
        <div className="flex flex-col gap-4">
          <p>We've provided six scopes that you may request when the user authorizes your application.</p>
          <div className="api-list">
            {API_SCOPES.map((scope) => (
              <div key={scope.name}>
                <strong>{scope.name}:</strong>
                <span>{scope.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
