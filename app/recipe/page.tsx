"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRecipe, getRecipe, putRecipe } from "@/lib/db";
import type { Recipe } from "@/lib/types";
import { cookedLabel, now } from "@/lib/utils";
import { buildShareUrl } from "@/lib/share";
import Stars from "@/components/Stars";
import { EmptyState, PrimaryLink, primaryBtnClass, softBtnClass } from "@/components/ui";

export default function RecipePageWrapper() {
  return (
    <Suspense fallback={<p className="text-muted text-center py-10">טוען…</p>}>
      <RecipeDetail />
    </Suspense>
  );
}

function RecipeDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const r = id ? await getRecipe(id) : null;
      if (active) setRecipe(r ?? null);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (recipe === undefined) {
    return <p className="text-muted text-center py-10">טוען…</p>;
  }
  if (recipe === null) {
    return (
      <EmptyState
        icon="🤷"
        title="המתכון לא נמצא"
        description="ייתכן שהוא נמחק."
        action={<PrimaryLink href="/recipes">חזרה למתכונים</PrimaryLink>}
      />
    );
  }

  const mainPhoto =
    recipe.photos.find((p) => p.id === recipe.mainPhotoId)?.data ??
    recipe.photos[0]?.data ??
    null;
  const gallery = recipe.photos.filter((p) => p.data !== mainPhoto);

  async function markCooked() {
    const updated = { ...recipe!, cookedCount: recipe!.cookedCount + 1, updatedAt: now() };
    setRecipe(updated);
    await putRecipe(updated);
  }

  async function setRating(v: number) {
    const updated = { ...recipe!, rating: v, updatedAt: now() };
    setRecipe(updated);
    await putRecipe(updated);
  }

  async function onShare() {
    const url = buildShareUrl(recipe!);
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe!.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg("הקישור הועתק ✓");
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch {
      /* user cancelled share */
    }
  }

  async function onDelete() {
    if (!confirm("למחוק את המתכון לצמיתות?")) return;
    await deleteRecipe(recipe!.id);
    router.push("/recipes");
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Hero photo */}
      {mainPhoto ? (
        <div className="-mx-4 -mt-3 aspect-[16/10] bg-primary-soft overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainPhoto} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      ) : null}

      {/* Title row */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>
          <span className="shrink-0 bg-primary-soft text-primary text-sm font-medium px-3 py-1 rounded-full">
            {recipe.category}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted">
          <Stars value={recipe.rating} onChange={setRating} size={20} />
          <span>•</span>
          <span>{cookedLabel(recipe.cookedCount)}</span>
        </div>
      </div>

      {/* Cooked button */}
      <button onClick={markCooked} className={primaryBtnClass("w-full")}>
        🍳 הכנתי את המתכון
      </button>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">מצרכים</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients.map((i) => (
              <span
                key={i.id}
                className="bg-primary-soft text-foreground rounded-full px-4 py-2 text-sm"
              >
                <span className="font-medium">{i.name}</span>
                {i.quantity && (
                  <span className="text-muted"> – {i.quantity}</span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Later-stage ingredients */}
      {recipe.laterIngredients.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>⏱️</span> מצרכים להמשך הבישול
          </h2>
          <div className="flex flex-wrap gap-2 bg-accent-soft border border-accent/30 rounded-2xl p-3">
            {recipe.laterIngredients.map((i) => (
              <span
                key={i.id}
                className="bg-surface border border-accent/40 text-foreground rounded-full px-4 py-2 text-sm"
              >
                <span className="font-medium">{i.name}</span>
                {i.quantity && (
                  <span className="text-muted"> – {i.quantity}</span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">אופן ההכנה</h2>
          <ol className="space-y-3">
            {recipe.steps.map((s, idx) => (
              <li key={s.id} className="flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-primary text-white text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="pt-0.5 leading-relaxed whitespace-pre-wrap">
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Video */}
      {recipe.videoUrl.trim() && (
        <a
          href={recipe.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={softBtnClass("w-full")}
        >
          ▶️ פתח סרטון מתכון
        </a>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">תמונות נוספות</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {gallery.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.data}
                alt=""
                className="w-28 h-28 object-cover rounded-xl border border-border shrink-0"
              />
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {recipe.notes.trim() && (
        <section>
          <h2 className="text-lg font-bold mb-2">הערות</h2>
          <p className="bg-surface border border-border rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {recipe.notes}
          </p>
        </section>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={onShare} className={softBtnClass()}>
          🔗 שתף מתכון
        </button>
        <Link
          href={`/recipe/edit/?id=${recipe.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold bg-surface border border-border"
        >
          ✏️ עריכה
        </Link>
      </div>
      {shareMsg && (
        <p className="text-center text-sm text-accent">{shareMsg}</p>
      )}
      <button
        onClick={onDelete}
        className="w-full text-center text-sm text-red-400 py-2"
      >
        מחק מתכון
      </button>
    </div>
  );
}
