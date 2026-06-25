"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllRecipes } from "@/lib/db";
import { RECIPE_CATEGORIES, type Recipe } from "@/lib/types";
import RecipeCard from "@/components/RecipeCard";
import { EmptyState, PageHeader, PrimaryLink } from "@/components/ui";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    getAllRecipes().then(setRecipes).catch(() => setRecipes([]));
  }, []);

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim();
    return recipes.filter((r) => {
      const matchQ = !q || r.title.includes(q);
      const matchC = !category || r.category === category;
      return matchQ && matchC;
    });
  }, [recipes, query, category]);

  return (
    <div className="space-y-4">
      <PageHeader title="המתכונים שלי" />

      {/* Search */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם מתכון…"
          className="w-full bg-surface border border-border rounded-full px-4 py-3 pe-11 text-[15px] outline-none focus:border-primary"
        />
        <span className="absolute top-1/2 -translate-y-1/2 end-4 text-muted">
          🔎
        </span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        <Chip active={!category} onClick={() => setCategory("")}>
          הכול
        </Chip>
        {RECIPE_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {/* Results */}
      {recipes === null ? (
        <p className="text-muted text-sm py-8 text-center">טוען…</p>
      ) : recipes.length === 0 ? (
        <EmptyState
          title="אין עדיין מתכונים"
          description="הוסיפו את המתכון הראשון שלכם ותתחילו לבנות את ספר המתכונים."
          action={<PrimaryLink href="/recipe/new">הוסף מתכון</PrimaryLink>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="לא נמצאו מתכונים"
          description="נסו לשנות את החיפוש או את הקטגוריה."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-primary text-white border-primary"
          : "bg-surface text-foreground border-border"
      }`}
    >
      {children}
    </button>
  );
}
