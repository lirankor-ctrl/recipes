// Best-effort cover thumbnails derived from a recipe's video link.
// Every function is defensive: it never throws and returns null when it
// cannot produce a usable thumbnail, so the UI can fall back to a placeholder.

/**
 * Known video providers. "other" = a valid URL from an unrecognized host,
 * "none" = empty / unparseable input. New hosts can be added here as the
 * import flow grows (Instagram, TikTok, Facebook, Vimeo, …).
 */
export type VideoProvider =
  | "youtube"
  | "vimeo"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "other"
  | "none";

/** Classify a video URL by provider without throwing. */
export function detectVideoProvider(url: string): VideoProvider {
  if (!url || !url.trim()) return "none";
  let host: string;
  try {
    host = new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return "none";
  }
  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) {
    return "youtube";
  }
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return "vimeo";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") {
    return "facebook";
  }
  return "other";
}

/** YouTube ids are always 11 url-safe characters. */
function isYouTubeId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

/**
 * Extract a YouTube video id from the common URL shapes, or null:
 *   youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID,
 *   youtube.com/embed/ID, youtube.com/v/ID, youtube.com/live/ID
 */
export function getYouTubeId(url: string): string | null {
  if (!url || !url.trim()) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return isYouTubeId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v && isYouTubeId(v)) return v;
    const m = u.pathname.match(/\/(?:shorts|embed|v|live)\/([^/?#]+)/);
    if (m && isYouTubeId(m[1])) return m[1];
  }

  return null;
}

/**
 * Synchronous YouTube thumbnail URL (no network request needed), or null.
 * `hqdefault.jpg` exists for effectively every public video and short.
 */
export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Best-effort thumbnail for non-YouTube providers via public oEmbed.
 * Only providers whose oEmbed endpoint is open + CORS-friendly are attempted
 * (Vimeo). Instagram / TikTok / Facebook require auth tokens, so they are
 * skipped and simply resolve to null.
 */
async function fetchOEmbedThumbnail(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  let endpoint: string | null = null;
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  }
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const thumb = (data as { thumbnail_url?: unknown })?.thumbnail_url;
    return typeof thumb === "string" && thumb.length > 0 ? thumb : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a cover thumbnail from a video URL. YouTube resolves instantly
 * (no network); other providers fall back to oEmbed. Never throws — returns
 * null when no thumbnail can be derived, so callers show a placeholder.
 */
export async function getVideoThumbnailUrl(videoUrl: string): Promise<string | null> {
  if (!videoUrl || !videoUrl.trim()) return null;
  const yt = getYouTubeThumbnail(videoUrl);
  if (yt) return yt;
  return fetchOEmbedThumbnail(videoUrl);
}
