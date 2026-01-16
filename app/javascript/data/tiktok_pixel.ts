import loadTiktokPixelScript from "$vendor/tiktok_pixel";

export type TikTokPixelConfig = { tiktokPixelId: string | null };

const initializedPixels = new Set<string>();

function shouldTrack() {
  return $('meta[property="gr:tiktok_pixel:enabled"]').attr("content") === "true";
}

export function startTrackingForSeller(data: TikTokPixelConfig) {
  if (!shouldTrack() || !data.tiktokPixelId || initializedPixels.has(data.tiktokPixelId)) return;

  loadTiktokPixelScript();
  ttq.load(data.tiktokPixelId);
  ttq.instance(data.tiktokPixelId).page();
  initializedPixels.add(data.tiktokPixelId);
}
