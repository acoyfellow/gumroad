declare module "$vendor/facebook_pixel" {
  const loadFacebookPixelScript: () => void;
  export default loadFacebookPixelScript;
}

declare module "$vendor/google_analytics_4" {
  const loadGoogleAnalyticsScript: () => void;
  export default loadGoogleAnalyticsScript;
}

declare module "$vendor/tiktok_pixel" {
  const loadTiktokPixelScript: () => void;
  export default loadTiktokPixelScript;
}

declare const ttq: {
  load: (id: string, config?: Record<string, unknown>) => void;
  page: () => void;
  track: (event: string, props?: Record<string, unknown>) => void;
  instance: (id: string) => {
    page: () => void;
    track: (event: string, props?: Record<string, unknown>) => void;
  };
};
