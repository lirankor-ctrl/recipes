// Title fallback chain. A recipe must always be savable, so we never require a
// typed title — we derive one. Priority:
//   1. Title already present (typed by the user, or the video title).
//   2. AI-suggested title (mock today).
//   3. First ingredient.
//   4. First preparation step.
//   5. Notes.
//   6. "מתכון ללא שם".

import type { Recipe } from "./types";
import { aiRecipeDraftService } from "./aiRecipeDraft";

export const UNTITLED_RECIPE = "מתכון ללא שם";

/** Collapse whitespace and cap length so a snippet reads like a title. */
function snippet(text: string, max = 40): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max).trim()}…` : oneLine;
}

// ----- Title sanitization for titles coming from video metadata -----

// Emojis, symbols, flags, dingbats, variation selectors, ZWJ.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{200D}]/gu;

// Hashtags incl. Hebrew/Unicode words: "#מתכונים", "#לאיודעת", "#2".
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;

// Episode / part / season markers, English and Hebrew.
const EPISODE_EN_RE = /\b(?:part|pt\.?|episode|ep\.?|season|vol\.?)\s*\d+\b/giu;
const EPISODE_HE_RE = /(?:חלק|פרק|עונה|מתכון מספר)\s*\d+/g;

// Separators after which the remainder is usually channel/branding text.
const SEPARATORS_RE = /[|•·‧·／/—–\-:]+/u;

// Branding / promo tokens dropped when they stand alone (compared lowercased,
// punctuation-stripped). Multi-word brands like "Easy Recipe" are covered
// token-by-token.
const BRAND_TOKENS = new Set([
  "מתכונים",
  "מתכוני",
  "recipe",
  "recipes",
  "shorts",
  "short",
  "official",
  "hd",
  "4k",
  "1080p",
  "720p",
  "fullhd",
  "tutorial",
  "vlog",
  "subscribe",
  "easy",
  "quick",
  "video",
  "asmr",
]);

function countLetters(s: string): number {
  return (s.match(/\p{L}/gu) ?? []).length;
}

/** Drop branding tokens and trim stray punctuation/whitespace from a segment. */
function cleanSegment(segment: string): string {
  const kept = segment
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => {
      const norm = t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      return norm.length > 0 && !BRAND_TOKENS.has(norm);
    });
  return kept
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "")
    .trim();
}

/**
 * Turn a raw video title into a clean, natural recipe name. Removes hashtags,
 * emojis, episode/part markers and channel/branding text, and when separators
 * are present keeps the first meaningful segment (usually the dish name).
 * Falls back to the original title if cleaning leaves nothing usable.
 */
export function cleanRecipeTitle(rawTitle: string): string {
  const raw = (rawTitle ?? "").trim();
  if (!raw) return "";

  const stripped = raw
    .replace(EMOJI_RE, " ")
    .replace(HASHTAG_RE, " ")
    .replace(EPISODE_EN_RE, " ")
    .replace(EPISODE_HE_RE, " ");

  // First meaningful segment across separators (recipe name comes first).
  for (const seg of stripped.split(SEPARATORS_RE)) {
    const cleaned = cleanSegment(seg);
    if (countLetters(cleaned) >= 2) return cleaned;
  }

  // No good segment — try the whole stripped string as one piece.
  const whole = cleanSegment(stripped);
  if (countLetters(whole) >= 2) return whole;

  // Nothing usable left → keep the original (requirement: never go empty).
  return raw;
}

/**
 * Resolve a non-empty title for a recipe. If a title is already present it is
 * returned untouched (never overwritten). Otherwise content is used to derive
 * one, falling back to "מתכון ללא שם". Never throws, never returns empty.
 */
export async function resolveRecipeTitle(r: Recipe): Promise<string> {
  // 1. existing title (user-typed or imported video title)
  const existing = r.title.trim();
  if (existing) return existing;

  // 2. AI-suggested title from content
  try {
    const ai = await aiRecipeDraftService.suggestTitle({
      ingredients: r.ingredients,
      steps: r.steps.map((s) => s.text),
      notes: r.notes,
    });
    if (ai && ai.trim()) return snippet(ai.trim());
  } catch {
    /* fall through to heuristic fallbacks */
  }

  // 3. first ingredient
  const ingredient = r.ingredients.find((i) => i.name.trim());
  if (ingredient) return snippet(ingredient.name);

  // 4. first preparation step
  const step = r.steps.find((s) => s.text.trim());
  if (step) return snippet(step.text);

  // 5. notes
  if (r.notes.trim()) return snippet(r.notes);

  // 6. last resort
  return UNTITLED_RECIPE;
}
