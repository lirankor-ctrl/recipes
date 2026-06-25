"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getAllRecipes } from "@/lib/db";
import type { Recipe } from "@/lib/types";
import RecipeCard from "@/components/RecipeCard";
import { EmptyState, PrimaryLink, SectionTitle } from "@/components/ui";

const inspiration = [
  {
    label: "חפש ביוטיוב",
    emoji: "▶️",
    href: "https://www.youtube.com/results?search_query=מתכונים",
  },
  {
    label: "חפש בגוגל",
    emoji: "🔎",
    href: "https://www.google.com/search?q=מתכונים",
  },
  {
    label: "רעיונות לקינוחים",
    emoji: "🍰",
    href: "https://www.google.com/search?q=רעיונות+לקינוחים",
  },
  {
    label: "רעיונות לארוחת ערב",
    emoji: "🍽️",
    href: "https://www.google.com/search?q=רעיונות+לארוחת+ערב",
  },
];

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);

  useEffect(() => {
    getAllRecipes().then(setRecipes).catch(() => setRecipes([]));
  }, []);

  const top =
    recipes
      ?.filter((r) => r.cookedCount > 0)
      .sort((a, b) => b.cookedCount - a.cookedCount)
      .slice(0, 6) ?? [];

  return (
    <div className="space-y-7">
      {/* Welcome header */}
      <header className="flex items-center gap-3 pt-1">
        <Image
          src="/logo.png"
          alt="מתכונים"
          width={48}
          height={48}
          className="rounded-2xl"
          priority
        />
        <div>
          <h1 className="text-2xl font-bold leading-tight">מתכונים</h1>
          <p className="text-sm text-muted">המטבח האישי שלך, במקום אחד</p>
        </div>
      </header>

      {/* Top recipes */}
      <section>
        <SectionTitle>המתכונים המובילים שלי</SectionTitle>
        {recipes === null ? (
          <LoadingGrid />
        ) : top.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {top.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🔥"
            title="עוד לא בישלת מתכונים"
            description='אחרי שתכין מתכון ותלחץ "הכנתי את המתכון", הוא יופיע כאן.'
            action={<PrimaryLink href="/recipe/new">הוסף מתכון ראשון</PrimaryLink>}
          />
        )}
      </section>

      {/* Inspiration */}
      <section>
        <SectionTitle>חיפוש השראה למתכונים</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {inspiration.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface border border-border rounded-[var(--radius-app)] p-4 flex items-center gap-3 active:bg-background transition-colors"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Add recipe CTA */}
      <div className="flex justify-center pt-1">
        <PrimaryLink href="/recipe/new">+ הוסף מתכון חדש</PrimaryLink>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-[var(--radius-app)] h-44 animate-pulse"
        />
      ))}
    </div>
  );
}
