"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RECIPE_CATEGORIES,
  type Ingredient,
  type PreparationStep,
  type Recipe,
  type RecipeCategory,
  type RecipePhoto,
} from "@/lib/types";
import { putRecipe } from "@/lib/db";
import { uid, now, fileToResizedDataUrl } from "@/lib/utils";
import { resolveRecipeTitle } from "@/lib/recipeTitle";
import Stars from "./Stars";
import {
  primaryBtnClass,
  outlineBtnClass,
  softBtnClass,
} from "./ui";

function emptyRecipe(): Recipe {
  const ts = now();
  return {
    id: uid(),
    title: "",
    category: "אחר",
    mainPhotoId: null,
    photos: [],
    ingredients: [],
    laterIngredients: [],
    steps: [],
    videoUrl: "",
    notes: "",
    rating: 0,
    cookedCount: 0,
    createdAt: ts,
    updatedAt: ts,
  };
}

export default function RecipeForm({
  initial,
  draftNotice,
}: {
  initial?: Recipe;
  /** Optional banner (e.g. "sample AI draft — review before saving"). */
  draftNotice?: string;
}) {
  const router = useRouter();
  const [r, setR] = useState<Recipe>(initial ?? emptyRecipe());
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  // DOM id of a freshly added field to focus once it has rendered. Held in a
  // ref (not state) so the effect can clear it without a cascading re-render;
  // a tick schedules the effect.
  const pendingFocusId = useRef<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const patch = (p: Partial<Recipe>) => setR((prev) => ({ ...prev, ...p }));

  function scheduleFocus(id: string) {
    pendingFocusId.current = id;
    setFocusTick((t) => t + 1);
  }

  useEffect(() => {
    const id = pendingFocusId.current;
    if (!id) return;
    pendingFocusId.current = null;
    document.getElementById(id)?.focus();
  }, [focusTick]);

  // ---- Photos ----
  async function onAddPhotos(files: FileList | null) {
    if (!files?.length) return;
    const added: RecipePhoto[] = [];
    for (const f of Array.from(files)) {
      try {
        const data = await fileToResizedDataUrl(f);
        added.push({ id: uid(), data });
      } catch {
        /* skip unreadable file */
      }
    }
    setR((prev) => {
      const photos = [...prev.photos, ...added];
      return {
        ...prev,
        photos,
        mainPhotoId: prev.mainPhotoId ?? photos[0]?.id ?? null,
      };
    });
  }

  function removePhoto(id: string) {
    setR((prev) => {
      const photos = prev.photos.filter((p) => p.id !== id);
      const mainPhotoId =
        prev.mainPhotoId === id ? photos[0]?.id ?? null : prev.mainPhotoId;
      return { ...prev, photos, mainPhotoId };
    });
  }

  // ---- Ingredient list helpers (regular + later share the shape) ----
  function addIngredient(key: "ingredients" | "laterIngredients") {
    const item: Ingredient = { id: uid(), name: "", quantity: "" };
    patch({ [key]: [...r[key], item] } as Partial<Recipe>);
    // focus the new ingredient's name input right away
    scheduleFocus(`ingname-${item.id}`);
  }
  function updateIngredient(
    key: "ingredients" | "laterIngredients",
    id: string,
    field: "name" | "quantity",
    value: string
  ) {
    patch({
      [key]: r[key].map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    } as Partial<Recipe>);
  }
  function removeIngredient(
    key: "ingredients" | "laterIngredients",
    id: string
  ) {
    patch({ [key]: r[key].filter((i) => i.id !== id) } as Partial<Recipe>);
  }

  // ---- Steps ----
  function addStep() {
    const s: PreparationStep = { id: uid(), text: "" };
    patch({ steps: [...r.steps, s] });
    // focus the new step's text field right away
    scheduleFocus(`step-${s.id}`);
  }
  function updateStep(id: string, text: string) {
    patch({ steps: r.steps.map((s) => (s.id === id ? { ...s, text } : s)) });
  }
  function removeStep(id: string) {
    patch({ steps: r.steps.filter((s) => s.id !== id) });
  }
  function moveStep(index: number, dir: -1 | 1) {
    const next = [...r.steps];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ steps: next });
  }

  async function onSubmit() {
    setSaving(true);
    // Title never blocks saving — derive one when left empty (existing titles
    // are kept as-is and never overwritten).
    const title = await resolveRecipeTitle(r);
    const clean: Recipe = {
      ...r,
      title,
      ingredients: r.ingredients.filter((i) => i.name.trim()),
      laterIngredients: r.laterIngredients.filter((i) => i.name.trim()),
      steps: r.steps.filter((s) => s.text.trim()),
      updatedAt: now(),
    };
    try {
      await putRecipe(clean);
      router.push(`/recipe/?id=${clean.id}`);
    } catch {
      setSaving(false);
      alert("שמירה נכשלה. נסו שוב.");
    }
  }

  return (
    <div className="space-y-6">
      {draftNotice && (
        <div className="flex items-start gap-2 bg-accent-soft border border-accent/40 text-foreground rounded-2xl px-4 py-3 text-sm">
          <span aria-hidden="true">🤖</span>
          <span className="font-medium leading-relaxed">{draftNotice}</span>
        </div>
      )}

      {/* Title (optional — derived automatically when left empty) */}
      <Field label="שם המתכון (לא חובה)">
        <input
          value={r.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="למשל: עוגת שוקולד של סבתא"
          className={inputClass}
        />
        <p className="text-xs text-muted mt-1.5">
          אפשר להשאיר ריק — נשלים שם אוטומטית, ותמיד אפשר לערוך.
        </p>
      </Field>

      {/* Category */}
      <Field label="קטגוריה">
        <select
          value={r.category}
          onChange={(e) =>
            patch({ category: e.target.value as RecipeCategory })
          }
          className={inputClass}
        >
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      {/* Photos */}
      <Field label="תמונות (התמונה הראשונה היא הראשית)">
        <div className="flex flex-wrap gap-2">
          {r.photos.map((p) => (
            <div
              key={p.id}
              className="relative w-20 h-20 rounded-xl overflow-hidden border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.data}
                alt=""
                className="w-full h-full object-cover"
              />
              {p.id === r.mainPhotoId && (
                <span className="absolute bottom-0 inset-x-0 bg-primary text-white text-[10px] text-center">
                  ראשית
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                className="absolute top-0.5 end-0.5 bg-black/60 text-white w-5 h-5 rounded-full text-xs leading-none"
                aria-label="הסר תמונה"
              >
                ×
              </button>
            </div>
          ))}
          <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-2xl text-muted cursor-pointer">
            +
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onAddPhotos(e.target.files)}
            />
          </label>
        </div>
      </Field>

      {/* Regular ingredients */}
      <IngredientEditor
        title="מצרכים"
        items={r.ingredients}
        onAdd={() => addIngredient("ingredients")}
        onUpdate={(id, f, v) => updateIngredient("ingredients", id, f, v)}
        onRemove={(id) => removeIngredient("ingredients", id)}
      />

      {/* Later-stage ingredients */}
      <IngredientEditor
        title="מצרכים להמשך הבישול"
        accent
        items={r.laterIngredients}
        onAdd={() => addIngredient("laterIngredients")}
        onUpdate={(id, f, v) => updateIngredient("laterIngredients", id, f, v)}
        onRemove={(id) => removeIngredient("laterIngredients", id)}
      />

      {/* Steps */}
      <Field label="שלבי הכנה">
        <div className="space-y-2">
          {r.steps.map((s, idx) => (
            <div key={s.id} className="flex gap-2 items-start">
              <span className="mt-3 w-6 h-6 shrink-0 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {idx + 1}
              </span>
              <textarea
                id={`step-${s.id}`}
                value={s.text}
                onChange={(e) => updateStep(s.id, e.target.value)}
                placeholder={`שלב ${idx + 1}`}
                rows={2}
                className={`${inputClass} resize-none`}
              />
              <div className="flex flex-col gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => moveStep(idx, -1)}
                  className="text-muted text-lg leading-none px-1"
                  aria-label="העבר למעלה"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(idx, 1)}
                  className="text-muted text-lg leading-none px-1"
                  aria-label="העבר למטה"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(s.id)}
                  className="text-red-400 text-sm px-1"
                  aria-label="מחק שלב"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            className={softBtnClass("w-full")}
          >
            + הוסף שלב
          </button>
        </div>
      </Field>

      {/* Video */}
      <Field label="קישור לסרטון">
        <input
          value={r.videoUrl}
          onChange={(e) => patch({ videoUrl: e.target.value })}
          placeholder="https://…"
          inputMode="url"
          dir="ltr"
          className={inputClass}
        />
      </Field>

      {/* Notes */}
      <Field label="הערות">
        <textarea
          value={r.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="טיפים, שינויים, מה לשפר בפעם הבאה…"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Field>

      {/* Rating */}
      <Field label="דירוג אישי">
        <Stars value={r.rating} onChange={(v) => patch({ rating: v })} size={28} />
      </Field>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSubmit}
          className={primaryBtnClass("flex-1")}
        >
          {saving ? "שומר…" : isEdit ? "שמור שינויים" : "שמור מתכון"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className={outlineBtnClass()}
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-surface border border-border rounded-2xl px-4 py-3 text-[15px] outline-none focus:border-primary";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}

function IngredientEditor({
  title,
  items,
  accent,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  items: Ingredient[];
  accent?: boolean;
  onAdd: () => void;
  onUpdate: (id: string, field: "name" | "quantity", value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Field label={title}>
      <div
        className={`space-y-2 ${
          accent
            ? "bg-accent-soft border border-accent/30 rounded-2xl p-3"
            : ""
        }`}
      >
        {items.map((i) => (
          <div key={i.id} className="flex gap-2">
            <input
              id={`ingname-${i.id}`}
              value={i.name}
              onChange={(e) => onUpdate(i.id, "name", e.target.value)}
              placeholder="מצרך"
              className={`${inputClass} flex-1`}
            />
            <input
              value={i.quantity}
              onChange={(e) => onUpdate(i.id, "quantity", e.target.value)}
              placeholder="כמות"
              className={`${inputClass} w-28`}
            />
            <button
              type="button"
              onClick={() => onRemove(i.id)}
              className="text-red-400 px-2"
              aria-label="מחק מצרך"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className={
            accent
              ? "w-full py-2.5 rounded-full text-sm font-semibold bg-accent/10 text-accent"
              : softBtnClass("w-full")
          }
        >
          + הוסף מצרך
        </button>
      </div>
    </Field>
  );
}
