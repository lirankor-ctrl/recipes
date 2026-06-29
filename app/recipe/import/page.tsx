"use client";

import { useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import {
  recipeImportService,
  buildImportedRecipe,
  type RecipeImportResult,
} from "@/lib/recipeImport";
import {
  aiRecipeDraftService,
  AI_DRAFT_SAMPLE_NOTICE,
} from "@/lib/aiRecipeDraft";
import RecipeForm from "@/components/RecipeForm";
import RecipeCover from "@/components/RecipeCover";
import { PageHeader } from "@/components/ui";
import {
  primaryBtnClass,
  softBtnClass,
  outlineBtnClass,
} from "@/components/ui";

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

  function continueManual() {
    if (!result) return;
    setSampleDraft(false);
    setInitialRecipe(buildImportedRecipe({ metadata: result.metadata }));
  }

  async function continueWithDraft() {
    if (!result || generating) return;
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
          onContinueManual={continueManual}
          onContinueDraft={continueWithDraft}
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
  onContinueManual,
  onContinueDraft,
}: {
  result: RecipeImportResult;
  generating: boolean;
  onContinueManual: () => void;
  onContinueDraft: () => void;
}) {
  const { metadata, message, isValid, fullySupported } = result;

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

      {message && (
        <p className="text-sm text-muted bg-primary-soft rounded-2xl px-4 py-3 leading-relaxed">
          {message}
        </p>
      )}

      {fullySupported ? (
        <div className="space-y-3">
          <p className="text-sm font-medium leading-relaxed">
            מצאנו את הסרטון. רוצה שאנסה ליצור ממנו טיוטת מתכון בעזרת AI?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onContinueDraft}
              disabled={generating}
              className={primaryBtnClass("flex-1")}
            >
              {generating ? "יוצר טיוטה…" : "כן, צור טיוטה"}
            </button>
            <button
              type="button"
              onClick={onContinueManual}
              disabled={generating}
              className={softBtnClass("flex-1")}
            >
              לא, אמשיך ידנית
            </button>
          </div>
        </div>
      ) : isValid ? (
        <button type="button" onClick={onContinueManual} className={primaryBtnClass("w-full")}>
          המשך למילוי המתכון
        </button>
      ) : null}
    </section>
  );
}
