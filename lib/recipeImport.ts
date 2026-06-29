// Recipe import orchestration.
//
// `RecipeImportService` turns a pasted URL (from anywhere) into a structured
// result the UI can act on: detected provider, resolved metadata, and a
// friendly Hebrew message when relevant. `buildImportedRecipe` maps metadata
// (+ an optional AI draft) into a fresh, fully-editable Recipe. Nothing is
// ever persisted here, and no ingredients/steps are ever fabricated.

import {
  detectProvider,
  resolveRecipeMetadata,
  type ImportStatus,
  type RecipeMetadata,
} from "./recipeProviders";
import type { AIRecipeDraft } from "./aiRecipeDraft";
import type { Recipe, RecipePhoto } from "./types";
import { now, uid } from "./utils";

export const IMPORT_MESSAGES = {
  noTitle:
    "מצאנו את הקישור, אך לא הצלחנו למשוך שם למתכון. אפשר להוסיף שם ידנית.",
  blocked:
    "מצאנו את הקישור. האתר לא מאפשר למשוך את הפרטים אוטומטית, אבל אפשר לשמור את המתכון ולהשלים ידנית.",
  invalid:
    "הקישור אינו נראה כמו כתובת תקינה. אפשר להדביק קישור אחר או להמשיך ידנית.",
  // Real ingredient/step extraction is not wired up yet.
  extractionInactive:
    "ייבוא מצרכים ואופן הכנה עדיין לא פעיל. בינתיים אפשר לשמור את הקישור ולהשלים את המתכון ידנית.",
} as const;

// Provider-specific fallback title used when no real title could be extracted.
const PROVIDER_FALLBACK_TITLE: Record<string, string> = {
  youtube: "מתכון מיוטיוב",
  facebook: "מתכון מפייסבוק",
  instagram: "מתכון מאינסטגרם",
  tiktok: "מתכון מטיקטוק",
  vimeo: "מתכון מ-Vimeo",
  web: "מתכון מהאתר",
};

/** A human-friendly fallback title based on the detected source. */
export function providerFallbackTitle(metadata: RecipeMetadata): string {
  return PROVIDER_FALLBACK_TITLE[metadata.provider] ?? "מתכון מקישור";
}

export interface RecipeImportResult {
  url: string;
  provider: string;
  /** A usable URL was recognized. */
  isValid: boolean;
  status: ImportStatus;
  metadata: RecipeMetadata;
  /** User-facing Hebrew note, or null when nothing needs to be said. */
  message: string | null;
}

function messageFor(metadata: RecipeMetadata): string | null {
  if (metadata.status === "url-only") return IMPORT_MESSAGES.blocked;
  if (!metadata.title) return IMPORT_MESSAGES.noTitle;
  return null;
}

export class RecipeImportService {
  async importFromUrl(rawUrl: string): Promise<RecipeImportResult> {
    const url = rawUrl.trim();
    const provider = detectProvider(url);

    if (!provider) {
      const metadata = await resolveRecipeMetadata(url);
      return {
        url,
        provider: "none",
        isValid: false,
        status: "url-only",
        metadata,
        message: IMPORT_MESSAGES.invalid,
      };
    }

    const metadata = await resolveRecipeMetadata(url);
    return {
      url,
      provider: metadata.provider,
      isValid: true,
      status: metadata.status,
      metadata,
      message: messageFor(metadata),
    };
  }
}

export const recipeImportService = new RecipeImportService();

/**
 * Build a fresh, fully-editable Recipe from imported metadata and an optional
 * AI draft. Title prefers the draft, then the metadata title. A thumbnail (when
 * available) is stored as the cover photo so the recipe has an image even for
 * non-YouTube sources. The data model has no prepTime/servings fields, so those
 * (when present on a draft) are folded into notes — no schema change.
 */
export function buildImportedRecipe(opts: {
  metadata: RecipeMetadata;
  draft?: AIRecipeDraft | null;
}): Recipe {
  const { metadata, draft } = opts;
  const ts = now();

  const noteParts: string[] = [];
  if (draft) {
    if (draft.notes.trim()) noteParts.push(draft.notes.trim());
    const m: string[] = [];
    if (draft.prepTime?.trim()) m.push(`⏱️ זמן הכנה: ${draft.prepTime.trim()}`);
    if (draft.servings?.trim()) m.push(`🍽️ כמות: ${draft.servings.trim()}`);
    if (m.length) noteParts.push(m.join(" · "));
  }

  // Persist the thumbnail (if any) as the main cover photo.
  const photos: RecipePhoto[] = [];
  if (metadata.thumbnailUrl) {
    photos.push({ id: uid(), data: metadata.thumbnailUrl });
  }

  return {
    id: uid(),
    // Always end up with a usable title: draft → real metadata → provider name.
    title: (draft?.title || metadata.title || providerFallbackTitle(metadata)).trim(),
    category: "אחר",
    mainPhotoId: photos[0]?.id ?? null,
    photos,
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
