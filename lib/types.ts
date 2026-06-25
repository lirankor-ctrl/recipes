// ===== Core data model for the recipes app =====

export const RECIPE_CATEGORIES = [
  "בשרי",
  "חלבי",
  "פרווה",
  "קינוחים",
  "מאפים",
  "סלטים",
  "מרקים",
  "ילדים",
  "חגים",
  "אחר",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export interface Ingredient {
  id: string;
  name: string; // e.g. "קמח"
  quantity: string; // e.g. "2 כוסות"
}

export interface PreparationStep {
  id: string;
  text: string;
}

/** A photo stored locally. `data` is a base64 data URL kept in IndexedDB. */
export interface RecipePhoto {
  id: string;
  data: string; // data URL (image/*;base64,...)
}

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory;
  mainPhotoId: string | null; // references a RecipePhoto.id (first photo = main)
  photos: RecipePhoto[];
  ingredients: Ingredient[];
  laterIngredients: Ingredient[]; // "מצרכים להמשך הבישול"
  steps: PreparationStep[];
  videoUrl: string;
  notes: string;
  rating: number; // 1..5, 0 = not rated
  cookedCount: number;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

/** JSON backup file produced by "ייצוא גיבוי". */
export interface BackupFile {
  app: "metkonim";
  version: 1;
  exportedAt: number;
  recipes: Recipe[];
}

/**
 * Payload encoded into a share link. Photos are optional/omittable so links
 * stay small; the structure already supports them for a later stage.
 */
export interface SharedRecipePayload {
  v: 1;
  title: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  laterIngredients: Ingredient[];
  steps: PreparationStep[];
  videoUrl: string;
  notes: string;
  rating: number;
  cookedCount: number;
  photos?: RecipePhoto[]; // included only when "small enough"
}
