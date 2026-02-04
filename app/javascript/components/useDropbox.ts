import * as React from "react";

export const useDropbox = (dropboxAppKey: string | undefined) => {
  React.useEffect(() => {
    if (!dropboxAppKey) return;

    const scriptId = "dropboxjs";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.async = true;
    script.setAttribute("data-app-key", dropboxAppKey);
    document.body.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [dropboxAppKey]);
};
