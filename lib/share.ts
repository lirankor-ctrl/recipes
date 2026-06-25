import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { Recipe, SharedRecipePayload } from "./types";
import { uid, now } from "./utils";

// Keep links comfortably under typical URL limits. Photos are only included
// when the resulting payload stays small.
const MAX_PAYLOAD_WITH_PHOTOS = 60_000; // chars of encoded string

export function recipeToPayload(recipe: Recipe): SharedRecipePayload {
  return {
    v: 1,
    title: recipe.title,
    category: recipe.category,
    ingredients: recipe.ingredients,
    laterIngredients: recipe.laterIngredients,
    steps: recipe.steps,
    videoUrl: recipe.videoUrl,
    notes: recipe.notes,
    rating: recipe.rating,
    cookedCount: recipe.cookedCount,
    photos: recipe.photos,
  };
}

/** Encode a recipe into a compact URL-safe token, dropping photos if too large. */
export function encodeShare(recipe: Recipe): string {
  const full = recipeToPayload(recipe);
  let token = compressToEncodedURIComponent(JSON.stringify(full));
  if (token.length > MAX_PAYLOAD_WITH_PHOTOS) {
    // Retry without photos to keep the link usable.
    const slim: SharedRecipePayload = { ...full, photos: undefined };
    token = compressToEncodedURIComponent(JSON.stringify(slim));
  }
  return token;
}

export function decodeShare(token: string): SharedRecipePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(token);
    if (!json) return null;
    const parsed = JSON.parse(json) as SharedRecipePayload;
    if (!parsed || parsed.v !== 1 || typeof parsed.title !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Turn a shared payload into a fresh local Recipe (new ids/timestamps). */
export function payloadToRecipe(payload: SharedRecipePayload): Recipe {
  const photos = (payload.photos ?? []).map((p) => ({ ...p, id: uid() }));
  const ts = now();
  return {
    id: uid(),
    title: payload.title,
    category: payload.category,
    photos,
    mainPhotoId: photos[0]?.id ?? null,
    ingredients: (payload.ingredients ?? []).map((i) => ({ ...i, id: uid() })),
    laterIngredients: (payload.laterIngredients ?? []).map((i) => ({
      ...i,
      id: uid(),
    })),
    steps: (payload.steps ?? []).map((s) => ({ ...s, id: uid() })),
    videoUrl: payload.videoUrl ?? "",
    notes: payload.notes ?? "",
    rating: payload.rating ?? 0,
    cookedCount: payload.cookedCount ?? 0,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function buildShareUrl(recipe: Recipe): string {
  const token = encodeShare(recipe);
  const base =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/share/#${token}`;
}
