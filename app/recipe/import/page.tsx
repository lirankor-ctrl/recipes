"use client";

import { useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import {
  recipeImportService,
  buildImportedRecipe,
  IMPORT_MESSAGES,
  type RecipeImportResult,
} from "@/lib/recipeImport";
import {
  aiRecipeDraftService,
  AI_DRAFT_SAMPLE_NOTICE,
} from "@/lib/aiRecipeDraft";
import RecipeForm from "@/components/RecipeForm";
import RecipeCover from "@/components/RecipeCover";
import { PageHeader, primaryBtnClass, softBtnClass, outlineBtnClass } from "@/components/ui";

// The mock AI draft fabricates sample ingredients/steps — it must NEVER run for
// normal users. It is only offered in a development build for testing the flow.
const SHOW_DEV_AI_MOCK = process.env.NODE_ENV === "development";

export default function ImportRecipePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecipeImportResult | null>(null);
  const [generating, setGenerating] = useState(false);

  // Once the user chooses how to continue, we render the prefilled form.
  const [initialRecipe, setInitialRecipe] = useState<Recipe | null>(null);
  const [sampleDraft, setSampleDraft] = useState(false);

  async function runImport() {
    const value = url.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      const res = await recipeImportService.importFromUrl(value);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  // Real path: carry over ONLY what we truly have — title, video URL, provider,
  // thumbnail. Ingredients and steps stay empty (filled in manually).
  function continueImport() {
    if (!result) return;
    setSampleDraft(false);
    setInitialRecipe(buildImportedRecipe({ metadata: result.metadata }));
  }

  // Development-only: prefill with the clearly-marked sample draft.
  async function continueWithMockDraft() {
    if (!result || generating || !SHOW_DEV_AI_MOCK) return;
    setGenerating(true);
    try {
      const draft = await aiRecipeDraftService.generateDraft({
        url: result.metadata.url,
        videoId: result.metadata.videoId,
        title: result.metadata.title,
      });
      setSampleDraft(true);
      setInitialRecipe(buildImportedRecipe({ metadata: result.metadata, draft }));
    } finally {
      setGenerating(false);
    }
  }

  // Phase 2: prefilled, fully-editable form (nothing is saved automatically).
  if (initialRecipe) {
    return (
      <div>
        <PageHeader title="מתכון מתוך סרטון" subtitle="אפשר לערוך הכול לפני השמירה" />
        <RecipeForm
          initial={initialRecipe}
          draftNotice={sampleDraft ? AI_DRAFT_SAMPLE_NOTICE : undefined}
        />
      </div>
    );
  }

  // Phase 1: paste a link and import.
  return (
    <div className="space-y-6">
      <PageHeader
        title="הוספת מתכון מסרטון"
        subtitle="הדרך המהירה להוסיף מתכון — מתחילים מקישור לסרטון"
      />

      <div className="space-y-3">
        <label className="block text-sm font-semibold">
          הדבק קישור לסרטון מתכון
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runImport();
          }}
          placeholder="https://youtube.com/…"
          inputMode="url"
          dir="ltr"
          className="w-full bg-surface border border-border rounded-2xl px-4 py-4 text-[15px] text-left outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={runImport}
          disabled={!url.trim() || loading}
          className={primaryBtnClass("w-full text-base py-4")}
        >
          {loading ? "מייבא…" : "📹 ייבא מהסרטון"}
        </button>
      </div>

      {result && (
        <ImportPreview
          result={result}
          generating={generating}
          onContinue={continueImport}
          onMockDraft={continueWithMockDraft}
        />
      )}

      {/* Secondary path — manual creation stays available. */}
      <div className="pt-2 text-center">
        <Link href="/recipe/new" className={outlineBtnClass()}>
          ✍️ הוסף מתכון ידנית
        </Link>
      </div>
    </div>
  );
}

function ImportPreview({
  result,
  generating,
  onContinue,
  onMockDraft,
}: {
  result: RecipeImportResult;
  generating: boolean;
  onContinue: () => void;
  onMockDraft: () => void;
}) {
  const { metadata, message, isValid } = result;

  return (
    <section className="space-y-4 bg-surface border border-border rounded-[var(--radius-app)] p-4">
      {isValid && (
        <div className="aspect-[16/10] bg-primary-soft rounded-2xl overflow-hidden">
          <RecipeCover
            photo={metadata.thumbnailUrl}
            videoUrl={metadata.url}
            alt={metadata.title ?? "תצוגה מקדימה של הסרטון"}
            placeholderClassName="text-5xl"
          />
        </div>
      )}

      {metadata.title ? (
        <div>
          <p className="text-xs text-muted mb-1">שם המתכון שזוהה</p>
          <p className="font-semibold leading-snug">{metadata.title}</p>
        </div>
      ) : null}

      {/* Provider-specific note (e.g. non-YouTube / no title). */}
      {message && (
        <p className="text-sm text-muted bg-primary-soft rounded-2xl px-4 py-3 leading-relaxed">
          {message}
        </p>
      )}

      {/* Real ingredient/step extraction is not active — be honest about it. */}
      {isValid && (
        <p className="text-sm text-muted bg-primary-soft rounded-2xl px-4 py-3 leading-relaxed">
          {IMPORT_MESSAGES.extractionInactive}
        </p>
      )}

      {isValid && (
        <button type="button" onClick={onContinue} className={primaryBtnClass("w-full")}>
          המשך — שמירת הסרטון ומילוי הפרטים
        </button>
      )}

      {/* Development-only sample-draft tester. Never shown to normal users. */}
      {isValid && SHOW_DEV_AI_MOCK && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[11px] text-muted">
            כלי פיתוח בלבד — ממלא נתוני דמה ולא נתונים אמיתיים מהסרטון.
          </p>
          <button
            type="button"
            onClick={onMockDraft}
            disabled={generating}
            className={softBtnClass("w-full")}
          >
            {generating ? "יוצר טיוטה…" : "🧪 מלא טיוטת AI לדוגמה (פיתוח)"}
          </button>
        </div>
      )}
    </section>
  );
}
