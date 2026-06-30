"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
      {/* Hero header */}
      <header className="flex flex-col items-center text-center pt-8 pb-2">
        <Image
          src="/logo.png"
          alt="מתכונים"
          width={100}
          height={100}
          className="w-20 sm:w-24 h-auto rounded-3xl"
          priority
        />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">מתכונים</h1>
        <p className="mt-2 text-base text-muted">כל המתכונים שלך. במקום אחד.</p>
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

      {/* Add recipe CTA — video import is the primary action */}
      <section className="space-y-3">
        <Link
          href="/recipe/import"
          className="flex items-center gap-4 bg-primary text-white rounded-[var(--radius-app)] p-5 shadow-sm shadow-primary/25 active:bg-primary-hover transition-colors"
        >
          <span className="text-3xl" aria-hidden="true">
            🔗
          </span>
          <span className="flex-1">
            <span className="block font-bold text-lg leading-tight">
              הוסף מתכון מקישור
            </span>
            <span className="block text-sm text-white/80 mt-0.5">
              יוטיוב, אינסטגרם, טיקטוק, פייסבוק או אתר מתכונים
            </span>
          </span>
          <span className="text-2xl" aria-hidden="true">
            ←
          </span>
        </Link>
        <Link
          href="/recipe/new"
          className="flex items-center justify-center gap-2 bg-surface border border-border rounded-[var(--radius-app)] py-3.5 font-semibold text-foreground active:bg-primary-soft transition-colors"
        >
          ✍️ הוסף מתכון ידנית
        </Link>
      </section>
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
