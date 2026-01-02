import React from "react";

type ApiResourceProps = {
  name: string;
  id: string;
  endpoints: React.ReactNode[];
};

export const ApiResource: React.FC<ApiResourceProps> = ({ name, id, endpoints }) => {
  return (
    <div className="stack" id={id}>
      <div>
        <h2>{name}</h2>
      </div>
      {endpoints}
    </div>
  );
};
