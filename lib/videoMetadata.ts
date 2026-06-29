// Pluggable video-metadata layer.
//
// A `VideoMetadataProvider` knows how to recognize a given host and pull
// best-effort metadata (title + thumbnail) from it. YouTube is fully
// supported today; other providers fall back to a generic best-effort
// implementation. Adding Instagram / TikTok / Facebook / Vimeo later is just
// a matter of implementing the interface and registering the provider.

import {
  detectVideoProvider,
  getVideoThumbnailUrl,
  getYouTubeId,
  getYouTubeThumbnail,
  type VideoProvider,
} from "./video";
import { cleanRecipeTitle } from "./recipeTitle";

export interface VideoMetadata {
  provider: VideoProvider;
  url: string;
  videoId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
}

export interface VideoMetadataProvider {
  readonly id: VideoProvider;
  /** Whether this provider can handle the given URL. */
  matches(url: string): boolean;
  /** Best-effort metadata. Must never throw. */
  fetchMetadata(url: string): Promise<VideoMetadata>;
}

/**
 * YouTube provider. Thumbnails resolve synchronously; the title is fetched
 * via the public oEmbed endpoint (no API key). The endpoint is not guaranteed
 * to be CORS-reachable from every browser, so a failure leaves `title: null`
 * and the caller shows a friendly "add a title manually" message.
 */
class YouTubeMetadataProvider implements VideoMetadataProvider {
  readonly id = "youtube" as const;

  matches(url: string): boolean {
    return detectVideoProvider(url) === "youtube";
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    const videoId = getYouTubeId(url);
    const thumbnailUrl = getYouTubeThumbnail(url);
    let title: string | null = null;
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
      );
      if (res.ok) {
        const data: unknown = await res.json();
        const t = (data as { title?: unknown })?.title;
        // Sanitize the raw YouTube title into a clean recipe name.
        if (typeof t === "string" && t.trim()) title = cleanRecipeTitle(t);
      }
    } catch {
      /* best-effort — leave title null */
    }
    return { provider: "youtube", url, videoId, title, thumbnailUrl };
  }
}

/**
 * Fallback for any non-YouTube host. We don't attempt fragile scraping; we
 * only reuse the safe thumbnail logic (e.g. Vimeo oEmbed) and never fetch a
 * title. Title stays null so the UI guides the user to fill it in manually.
 */
class GenericMetadataProvider implements VideoMetadataProvider {
  readonly id = "other" as const;

  matches(): boolean {
    return true;
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    const provider = detectVideoProvider(url);
    let thumbnailUrl: string | null = null;
    try {
      thumbnailUrl = await getVideoThumbnailUrl(url);
    } catch {
      /* best-effort */
    }
    return { provider, url, videoId: null, title: null, thumbnailUrl };
  }
}

// Registered providers, in priority order. Append future providers here.
const providers: VideoMetadataProvider[] = [new YouTubeMetadataProvider()];
const fallbackProvider = new GenericMetadataProvider();

/** Resolve best-effort metadata for any URL. Never throws. */
export async function resolveVideoMetadata(url: string): Promise<VideoMetadata> {
  const provider = providers.find((p) => p.matches(url)) ?? fallbackProvider;
  return provider.fetchMetadata(url);
}
