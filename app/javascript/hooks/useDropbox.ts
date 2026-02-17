import { useEffect } from "react";

export const useDropbox = (apiKey: string | null | undefined) => {
  useEffect(() => {
    const scriptId = "dropboxjs";
    if (!apiKey || document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.setAttribute("data-app-key", apiKey);
    script.async = true;
    document.body.appendChild(script);
  }, [apiKey]);
};
