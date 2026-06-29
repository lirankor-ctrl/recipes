"use client";

import { useEffect, useState } from "react";
import { getVideoThumbnailUrl, getYouTubeThumbnail } from "@/lib/video";

interface RecipeCoverProps {
  /** Uploaded main photo (data URL) — highest priority when present. */
  photo: string | null;
  /** Recipe video link, used to derive a thumbnail fallback. */
  videoUrl?: string;
  alt: string;
  /** Tailwind text-size for the placeholder icon (cards vs. hero). */
  placeholderClassName?: string;
}

/**
 * Cover image with graceful fallback:
 *   1. uploaded photo  →  2. video thumbnail  →  3. clean placeholder icon.
 * Fills its parent (which sets the aspect ratio / background).
 */
export default function RecipeCover({
  photo,
  videoUrl = "",
  alt,
  placeholderClassName = "text-3xl",
}: RecipeCoverProps) {
  // YouTube thumbnails resolve synchronously — derive during render.
  const ytThumb = photo ? null : getYouTubeThumbnail(videoUrl);
  // Async fallback (Vimeo / oEmbed) is filled in by the effect below.
  const [asyncThumb, setAsyncThumb] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Reset transient state when the source inputs change (render-phase reset,
  // React's recommended alternative to resetting inside an effect).
  const sourceKey = `${photo ? "p" : "-"}|${videoUrl}`;
  const [prevKey, setPrevKey] = useState(sourceKey);
  if (prevKey !== sourceKey) {
    setPrevKey(sourceKey);
    setAsyncThumb(null);
    setFailed(false);
  }

  useEffect(() => {
    // Only providers needing a network lookup reach the effect.
    if (photo || ytThumb || !videoUrl.trim()) return;
    let active = true;
    getVideoThumbnailUrl(videoUrl)
      .then((url) => {
        if (active) setAsyncThumb(url);
      })
      .catch(() => {
        /* ignore — placeholder will show */
      });
    return () => {
      active = false;
    };
  }, [photo, videoUrl, ytThumb]);

  const candidate = photo ?? ytThumb ?? asyncThumb;
  const src = failed ? null : candidate;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`w-full h-full flex items-center justify-center text-primary/50 ${placeholderClassName}`}
      aria-hidden="true"
    >
      🍳
    </div>
  );
}
