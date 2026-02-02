import * as React from "react";

const DROPBOX_SCRIPT_URL = "https://www.dropbox.com/static/api/2/dropins.js";

let loadPromise: Promise<void> | null = null;

interface DropboxFile {
  id: string;
  link: string;
  bytes: number;
  name: string;
}

const loadDropboxScript = (): Promise<void> => {
  if (window.Dropbox) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  const dropboxApiKey = (process.env as any).DROPBOX_PICKER_API_KEY ?? "";

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = DROPBOX_SCRIPT_URL;
    script.async = true;
    script.setAttribute("data-app-key", dropboxApiKey);
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Dropbox script"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};

export function useDropbox() {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    loadDropboxScript()
      .then(() => setIsLoaded(true))
      .catch((err: unknown) => setError(err as any));
  }, []);

  const choose = (options: {
    linkType: "direct";
    multiselect: boolean;
    success: (files: DropboxFile[]) => void;
    cancel?: () => void;
    extensions?: string[][];
  }) => {
    if (!window.Dropbox) {
      options.cancel?.();
      return;
    }
    window.Dropbox.choose(options);
  };

  return { isLoaded, error, choose };
}
