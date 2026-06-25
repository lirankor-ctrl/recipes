"use client";

import Link from "next/link";
import type { Recipe } from "@/lib/types";
import Stars from "./Stars";

function mainPhoto(recipe: Recipe): string | null {
  if (recipe.mainPhotoId) {
    const found = recipe.photos.find((p) => p.id === recipe.mainPhotoId);
    if (found) return found.data;
  }
  return recipe.photos[0]?.data ?? null;
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const photo = mainPhoto(recipe);
  return (
    <Link
      href={`/recipe/?id=${recipe.id}`}
      className="block bg-surface rounded-[var(--radius-app)] border border-border overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div className="aspect-[16/10] bg-primary-soft relative">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/50 text-3xl">
            🍳
          </div>
        )}
        <span className="absolute top-2 start-2 bg-surface/90 text-foreground text-xs font-medium px-2.5 py-1 rounded-full">
          {recipe.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[15px] clamp-2 leading-snug">
          {recipe.title}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <Stars value={recipe.rating} size={15} />
          <span className="text-xs text-muted">
            {recipe.cookedCount > 0 ? `🔥 ${recipe.cookedCount}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
