// Provider-based recipe-link import.
//
// Each provider can `detect` a URL and `fetchMetadata` for it, returning a
// uniform `RecipeMetadata` (provider, title, thumbnail, original URL, status,
// confidence). Everything is best-effort and defensive: providers never throw
// and never scrape aggressively. When a site blocks metadata we simply keep the
// URL and report `status: "url-only"`.
//
// Reality check: this is a static client-side PWA, so cross-origin metadata is
// limited by CORS. YouTube / Vimeo / TikTok expose CORS-friendly oEmbed
// endpoints (no API key); Facebook / Instagram require app tokens and resolve
// to url-only; generic pages try Open Graph but are usually CORS-blocked.

import { cleanRecipeTitle } from "./recipeTitle";
import { getYouTubeId, getYouTubeThumbnail } from "./video";

export type ImportStatus = "full" | "partial" | "url-only";

export interface RecipeMetadata {
  /** Machine name, e.g. "youtube", "tiktok", "web". */
  provider: string;
  /** Hebrew label for display, e.g. "יוטיוב". */
  providerLabel: string;
  url: string;
  videoId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  status: ImportStatus;
  confidence: number; // 0..1
}

export interface RecipeImportProvider {
  readonly name: string;
  readonly label: string;
  detect(url: string): boolean;
  fetchMetadata(url: string): Promise<RecipeMetadata>;
}

// ---- shared helpers ----

function hostOf(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function statusFrom(title: string | null, thumb: string | null): ImportStatus {
  if (title && thumb) return "full";
  if (title || thumb) return "partial";
  return "url-only";
}

function confidenceFor(status: ImportStatus): number {
  return status === "full" ? 0.9 : status === "partial" ? 0.6 : 0.3;
}

function meta(
  name: string,
  label: string,
  url: string,
  fields: Partial<RecipeMetadata> = {}
): RecipeMetadata {
  const title = fields.title ?? null;
  const thumbnailUrl = fields.thumbnailUrl ?? null;
  const status = statusFrom(title, thumbnailUrl);
  return {
    provider: name,
    providerLabel: label,
    url,
    videoId: fields.videoId ?? null,
    title,
    thumbnailUrl,
    description: fields.description ?? null,
    status,
    confidence: confidenceFor(status),
  };
}

async function fetchJson(endpoint: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Best-effort oEmbed lookup → { title, thumb }. Never throws. */
async function oEmbed(
  url: string,
  endpointBase: string
): Promise<{ title: string | null; thumb: string | null }> {
  const data = await fetchJson(`${endpointBase}${encodeURIComponent(url)}`);
  const rawTitle = typeof data?.title === "string" ? data.title : null;
  const thumb =
    typeof data?.thumbnail_url === "string" ? (data.thumbnail_url as string) : null;
  return { title: rawTitle ? cleanRecipeTitle(rawTitle) : null, thumb };
}

// Minimal HTML entity decode for Open Graph content values.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Read the first matching <meta> content for any of the given property keys. */
function metaContent(html: string, keys: string[]): string | null {
  const wanted = keys.map((k) => k.toLowerCase());
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const prop = (
      tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] ?? ""
    ).toLowerCase();
    if (wanted.includes(prop)) {
      const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      if (content && content.trim()) return decodeEntities(content.trim());
    }
  }
  return null;
}

// ---- providers ----

export const YouTubeProvider: RecipeImportProvider = {
  name: "youtube",
  label: "יוטיוב",
  detect(url) {
    const h = hostOf(url);
    return !!h && (h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com"));
  },
  async fetchMetadata(url) {
    const videoId = getYouTubeId(url);
    const thumb = getYouTubeThumbnail(url);
    const { title } = await oEmbed(url, "https://www.youtube.com/oembed?format=json&url=");
    return meta("youtube", "יוטיוב", url, { videoId, title, thumbnailUrl: thumb });
  },
};

export const VimeoProvider: RecipeImportProvider = {
  name: "vimeo",
  label: "Vimeo",
  detect(url) {
    const h = hostOf(url);
    return !!h && (h === "vimeo.com" || h.endsWith(".vimeo.com"));
  },
  async fetchMetadata(url) {
    const { title, thumb } = await oEmbed(url, "https://vimeo.com/api/oembed.json?url=");
    return meta("vimeo", "Vimeo", url, { title, thumbnailUrl: thumb });
  },
};

export const TikTokProvider: RecipeImportProvider = {
  name: "tiktok",
  label: "טיקטוק",
  detect(url) {
    const h = hostOf(url);
    return !!h && (h === "tiktok.com" || h.endsWith(".tiktok.com"));
  },
  async fetchMetadata(url) {
    // TikTok exposes a public, CORS-friendly oEmbed endpoint (no token).
    const { title, thumb } = await oEmbed(url, "https://www.tiktok.com/oembed?url=");
    return meta("tiktok", "טיקטוק", url, { title, thumbnailUrl: thumb });
  },
};

export const FacebookProvider: RecipeImportProvider = {
  name: "facebook",
  label: "פייסבוק",
  detect(url) {
    const h = hostOf(url);
    return (
      !!h &&
      (h === "facebook.com" ||
        h.endsWith(".facebook.com") ||
        h === "fb.watch" ||
        h === "fb.me")
    );
  },
  async fetchMetadata(url) {
    // Facebook oEmbed needs an app token — no safe token-free metadata.
    return meta("facebook", "פייסבוק", url, {});
  },
};

export const InstagramProvider: RecipeImportProvider = {
  name: "instagram",
  label: "אינסטגרם",
  detect(url) {
    const h = hostOf(url);
    return !!h && (h === "instagram.com" || h.endsWith(".instagram.com"));
  },
  async fetchMetadata(url) {
    // Instagram oEmbed needs an app token — keep the URL only.
    return meta("instagram", "אינסטגרם", url, {});
  },
};

export const GenericWebProvider: RecipeImportProvider = {
  name: "web",
  label: "אתר",
  detect(url) {
    return hostOf(url) !== null;
  },
  async fetchMetadata(url) {
    try {
      const res = await fetch(url, { headers: { Accept: "text/html" } });
      if (!res.ok) return meta("web", "אתר", url, {});
      const html = await res.text();
      const rawTitle =
        metaContent(html, ["og:title", "twitter:title"]) ??
        html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ??
        null;
      const thumb = metaContent(html, [
        "og:image",
        "og:image:url",
        "twitter:image",
        "twitter:image:src",
      ]);
      const description = metaContent(html, [
        "og:description",
        "twitter:description",
        "description",
      ]);
      return meta("web", "אתר", url, {
        title: rawTitle ? cleanRecipeTitle(rawTitle) : null,
        thumbnailUrl: thumb,
        description,
      });
    } catch {
      // CORS / network block — keep the URL, nothing else.
      return meta("web", "אתר", url, {});
    }
  },
};

// Specific providers first; the generic web provider is the catch-all fallback.
const SPECIFIC_PROVIDERS: RecipeImportProvider[] = [
  YouTubeProvider,
  VimeoProvider,
  TikTokProvider,
  FacebookProvider,
  InstagramProvider,
];

/** Pick a provider for the URL, or null when the input is not a usable URL. */
export function detectProvider(url: string): RecipeImportProvider | null {
  if (hostOf(url) === null) return null;
  return SPECIFIC_PROVIDERS.find((p) => p.detect(url)) ?? GenericWebProvider;
}

/** Resolve best-effort metadata for any URL. Never throws. */
export async function resolveRecipeMetadata(url: string): Promise<RecipeMetadata> {
  const provider = detectProvider(url);
  if (!provider) {
    return meta("none", "", url.trim(), {});
  }
  try {
    return await provider.fetchMetadata(url.trim());
  } catch {
    return meta(provider.name, provider.label, url.trim(), {});
  }
}
