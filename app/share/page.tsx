"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeShare, payloadToRecipe } from "@/lib/share";
import { addRecipes } from "@/lib/db";
import type { SharedRecipePayload } from "@/lib/types";
import Stars from "@/components/Stars";
import { cookedLabel } from "@/lib/utils";
import { EmptyState, PrimaryLink, primaryBtnClass } from "@/components/ui";

export default function SharePage() {
  const router = useRouter();
  const [payload, setPayload] = useState<SharedRecipePayload | null | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    // microtask defers the state update out of the synchronous effect body
    Promise.resolve().then(() => {
      if (!active) return;
      const token = window.location.hash.replace(/^#/, "");
      const decoded = token
        ? decodeShare(decodeURIComponent(token))
        : null;
      setPayload(decoded ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSave() {
    if (!payload) return;
    setSaving(true);
    try {
      const recipe = payloadToRecipe(payload);
      await addRecipes([recipe]);
      router.push(`/recipe/?id=${recipe.id}`);
    } catch {
      setSaving(false);
      alert("השמירה נכשלה. נסו שוב.");
    }
  }

  if (payload === undefined) {
    return <p className="text-muted text-center py-10">טוען…</p>;
  }
  if (payload === null) {
    return (
      <EmptyState
        icon="🔗"
        title="קישור לא תקין"
        description="לא ניתן לפענח את המתכון מהקישור הזה."
        action={<PrimaryLink href="/">למסך הבית</PrimaryLink>}
      />
    );
  }

  const mainPhoto = payload.photos?.[0]?.data ?? null;

  return (
    <div className="space-y-6 pb-4">
      <div className="text-center text-sm text-muted bg-primary-soft rounded-full py-2 px-4">
        מתכון ששותף איתך — תצוגה בלבד
      </div>

      {mainPhoto && (
        <div className="-mx-4 aspect-[16/10] bg-primary-soft overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainPhoto} alt={payload.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">{payload.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted">
          <span className="bg-primary-soft text-primary px-3 py-1 rounded-full">
            {payload.category}
          </span>
          <Stars value={payload.rating} size={18} />
          <span>{cookedLabel(payload.cookedCount)}</span>
        </div>
      </div>

      <button onClick={onSave} disabled={saving} className={primaryBtnClass("w-full")}>
        {saving ? "שומר…" : "⬇️ שמור למתכונים שלי"}
      </button>

      {payload.ingredients?.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">מצרכים</h2>
          <div className="flex flex-wrap gap-2">
            {payload.ingredients.map((i) => (
              <span key={i.id} className="bg-primary-soft rounded-full px-4 py-2 text-sm">
                <span className="font-medium">{i.name}</span>
                {i.quantity && <span className="text-muted"> – {i.quantity}</span>}
              </span>
            ))}
          </div>
        </section>
      )}

      {payload.laterIngredients?.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">⏱️ מצרכים להמשך הבישול</h2>
          <div className="flex flex-wrap gap-2 bg-accent-soft border border-accent/30 rounded-2xl p-3">
            {payload.laterIngredients.map((i) => (
              <span
                key={i.id}
                className="bg-surface border border-accent/40 rounded-full px-4 py-2 text-sm"
              >
                <span className="font-medium">{i.name}</span>
                {i.quantity && <span className="text-muted"> – {i.quantity}</span>}
              </span>
            ))}
          </div>
        </section>
      )}

      {payload.steps?.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">אופן ההכנה</h2>
          <ol className="space-y-3">
            {payload.steps.map((s, idx) => (
              <li key={s.id} className="flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-primary text-white text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="pt-0.5 leading-relaxed whitespace-pre-wrap">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {payload.videoUrl?.trim() && (
        <a
          href={payload.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center bg-primary-soft text-primary rounded-full py-3 font-semibold"
        >
          ▶️ פתח סרטון מתכון
        </a>
      )}

      {payload.notes?.trim() && (
        <section>
          <h2 className="text-lg font-bold mb-2">הערות</h2>
          <p className="bg-surface border border-border rounded-2xl p-4 text-sm whitespace-pre-wrap">
            {payload.notes}
          </p>
        </section>
      )}
    </div>
  );
}
