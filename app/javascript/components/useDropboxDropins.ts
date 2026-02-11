import { useEffect } from "react";

const DROPBOX_DROPINS_SCRIPT_URL = "https://www.dropbox.com/static/api/2/dropins.js";

export const useDropboxDropins = (appKey: string): void => {
  useEffect(() => {
    if (document.getElementById("dropboxjs")) return;

    const script = document.createElement("script");
    script.id = "dropboxjs";
    script.src = DROPBOX_DROPINS_SCRIPT_URL;
    script.async = true;
    script.setAttribute("data-app-key", appKey);
    script.type = "text/javascript";
    document.head.appendChild(script);

    return () => script.remove();
  }, [appKey]);
};
