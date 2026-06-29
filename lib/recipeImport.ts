// Recipe import orchestration.
//
// `RecipeImportService` turns a pasted URL into a structured result the UI can
// act on: which provider, whether full auto-import is supported (YouTube), the
// resolved metadata, and a friendly Hebrew message when relevant.
// `buildImportedRecipe` maps metadata (+ an optional AI draft) into a fresh,
// fully-editable Recipe. Nothing is ever persisted here.

import { detectVideoProvider, type VideoProvider } from "./video";
import { resolveVideoMetadata, type VideoMetadata } from "./videoMetadata";
import type { AIRecipeDraft } from "./aiRecipeDraft";
import type { Recipe } from "./types";
import { now, uid } from "./utils";

export const IMPORT_MESSAGES = {
  noTitle:
    "מצאנו את הסרטון, אך לא הצלחנו למשוך את שם המתכון. אפשר להוסיף שם ידנית.",
  notYouTube:
    "בשלב זה ייבוא אוטומטי מלא נתמך בעיקר מיוטיוב. אפשר להמשיך למלא את המתכון ידנית.",
  invalid:
    "הקישור אינו נראה כמו כתובת תקינה של סרטון. אפשר להדביק קישור אחר או להמשיך ידנית.",
  // Real ingredient/step extraction is not wired up yet.
  extractionInactive:
    "ייבוא מצרכים ואופן הכנה עדיין לא פעיל. בינתיים אפשר לשמור את הסרטון ולהוסיף את הפרטים ידנית.",
} as const;

export interface RecipeImportResult {
  url: string;
  provider: VideoProvider;
  /** A usable video URL was recognized. */
  isValid: boolean;
  /** Full auto-import is supported for this provider (YouTube today). */
  fullySupported: boolean;
  metadata: VideoMetadata;
  /** User-facing Hebrew note, or null when nothing needs to be said. */
  message: string | null;
}

export class RecipeImportService {
  async importFromUrl(rawUrl: string): Promise<RecipeImportResult> {
    const url = rawUrl.trim();
    const provider = detectVideoProvider(url);

    if (provider === "none") {
      return {
        url,
        provider,
        isValid: false,
        fullySupported: false,
        metadata: { provider, url, videoId: null, title: null, thumbnailUrl: null },
        message: IMPORT_MESSAGES.invalid,
      };
    }

    const metadata = await resolveVideoMetadata(url);

    if (provider === "youtube") {
      return {
        url,
        provider,
        isValid: true,
        fullySupported: true,
        metadata,
        message: metadata.title ? null : IMPORT_MESSAGES.noTitle,
      };
    }

    // Non-YouTube: keep the URL + best-effort thumbnail, guide to manual entry.
    return {
      url,
      provider,
      isValid: true,
      fullySupported: false,
      metadata,
      message: IMPORT_MESSAGES.notYouTube,
    };
  }
}

export const recipeImportService = new RecipeImportService();

/**
 * Build a fresh, fully-editable Recipe from imported metadata and an optional
 * AI draft. Title prefers the draft, then the video title. The data model has
 * no prepTime/servings fields, so those (when present on a draft) are folded
 * into notes rather than forcing a schema change.
 */
export function buildImportedRecipe(opts: {
  metadata: VideoMetadata;
  draft?: AIRecipeDraft | null;
}): Recipe {
  const { metadata, draft } = opts;
  const ts = now();

  const noteParts: string[] = [];
  if (draft) {
    if (draft.notes.trim()) noteParts.push(draft.notes.trim());
    const meta: string[] = [];
    if (draft.prepTime?.trim()) meta.push(`⏱️ זמן הכנה: ${draft.prepTime.trim()}`);
    if (draft.servings?.trim()) meta.push(`🍽️ כמות: ${draft.servings.trim()}`);
    if (meta.length) noteParts.push(meta.join(" · "));
  }

  return {
    id: uid(),
    title: (draft?.title || metadata.title || "").trim(),
    category: "אחר",
    mainPhotoId: null,
    photos: [],
    ingredients: (draft?.ingredients ?? []).map((i) => ({
      id: uid(),
      name: i.name,
      quantity: i.quantity,
    })),
    laterIngredients: (draft?.laterIngredients ?? []).map((i) => ({
      id: uid(),
      name: i.name,
      quantity: i.quantity,
    })),
    steps: (draft?.steps ?? []).map((text) => ({ id: uid(), text })),
    videoUrl: metadata.url,
    notes: noteParts.join("\n\n"),
    rating: 0,
    cookedCount: 0,
    createdAt: ts,
    updatedAt: ts,
  };
}
