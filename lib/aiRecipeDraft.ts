// AI recipe-draft layer (stub).
//
// No real AI API is wired up yet. `AIRecipeDraftService` defines the shape a
// future provider will implement; `mockAIRecipeDraftService` returns a clearly
// marked SAMPLE draft for development only. The draft intentionally carries
// optional `prepTime` / `servings` so a real provider can populate them later —
// the current data model has no dedicated fields, so the import mapper folds
// them into the recipe notes (no data-model change required).

export interface AIDraftIngredient {
  name: string;
  quantity: string;
}

export interface AIRecipeDraft {
  /** Always true for the mock; signals "review before saving" in the UI. */
  isSample: boolean;
  title: string;
  ingredients: AIDraftIngredient[];
  laterIngredients: AIDraftIngredient[];
  steps: string[];
  notes: string;
  prepTime?: string;
  servings?: string;
}

export interface AIRecipeDraftInput {
  url: string;
  videoId: string | null;
  title: string | null;
}

/** Content used to infer a title when none was provided. */
export interface AITitleInput {
  ingredients: { name: string }[];
  steps: string[];
  notes: string;
}

export interface AIRecipeDraftService {
  generateDraft(input: AIRecipeDraftInput): Promise<AIRecipeDraft>;
  /** Best-effort title from recipe content. Returns null if nothing usable. */
  suggestTitle(input: AITitleInput): Promise<string | null>;
}

/** Shown prominently wherever a sample draft is rendered. */
export const AI_DRAFT_SAMPLE_NOTICE =
  "טיוטת AI לדוגמה — יש לעבור עליה לפני שמירה.";

class MockAIRecipeDraftService implements AIRecipeDraftService {
  async generateDraft(input: AIRecipeDraftInput): Promise<AIRecipeDraft> {
    // Deterministic placeholder content — NOT derived from the real video.
    return {
      isSample: true,
      title: input.title?.trim() || "מתכון לדוגמה מתוך סרטון",
      ingredients: [
        { name: "קמח", quantity: "2 כוסות" },
        { name: "סוכר", quantity: "1 כוס" },
        { name: "ביצים", quantity: "3 יחידות" },
        { name: "חמאה רכה", quantity: "100 גרם" },
        { name: "אבקת אפייה", quantity: "1 כפית" },
      ],
      laterIngredients: [{ name: "שוקולד צ'יפס", quantity: "1/2 כוס" }],
      steps: [
        "מחממים תנור ל-180 מעלות ומשמנים תבנית.",
        "מערבבים בקערה את הקמח, הסוכר ואבקת האפייה.",
        "מוסיפים את הביצים והחמאה ולשים לבלילה אחידה.",
        "מקפלים פנימה את שוקולד הצ'יפס.",
        "אופים כ-25 דקות עד שקיסם יוצא יבש.",
      ],
      notes:
        "זוהי טיוטת AI לדוגמה בלבד. החליפו את התוכן בפרטי המתכון האמיתי מתוך הסרטון.",
      prepTime: "45 דקות",
      servings: "8 מנות",
    };
  }

  async suggestTitle(input: AITitleInput): Promise<string | null> {
    // Mock heuristic: a real provider would summarize the content. Here we
    // build a readable Hebrew title from the leading ingredients.
    const names = input.ingredients
      .map((i) => i.name.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (names.length) return `מתכון ${names.join(" ו")}`;
    return null;
  }
}

export const aiRecipeDraftService: AIRecipeDraftService =
  new MockAIRecipeDraftService();
