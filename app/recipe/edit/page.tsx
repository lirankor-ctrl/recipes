"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRecipe } from "@/lib/db";
import type { Recipe } from "@/lib/types";
import RecipeForm from "@/components/RecipeForm";
import { EmptyState, PageHeader, PrimaryLink } from "@/components/ui";

export default function EditPageWrapper() {
  return (
    <Suspense fallback={<p className="text-muted text-center py-10">טוען…</p>}>
      <EditRecipe />
    </Suspense>
  );
}

function EditRecipe() {
  const id = useSearchParams().get("id");
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);

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
        action={<PrimaryLink href="/recipes">חזרה למתכונים</PrimaryLink>}
      />
    );
  }

  return (
    <div>
      <PageHeader title="עריכת מתכון" />
      <RecipeForm initial={recipe} />
    </div>
  );
}
