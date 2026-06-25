"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Recipe } from "./types";

interface RecipesDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
    indexes: { byUpdatedAt: number; byCookedCount: number };
  };
}

const DB_NAME = "metkonim";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RecipesDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<RecipesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("recipes", { keyPath: "id" });
        store.createIndex("byUpdatedAt", "updatedAt");
        store.createIndex("byCookedCount", "cookedCount");
      },
    });
  }
  return dbPromise;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  const all = await db.getAll("recipes");
  // newest first by default
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const db = await getDB();
  return db.get("recipes", id);
}

export async function putRecipe(recipe: Recipe): Promise<void> {
  const db = await getDB();
  await db.put("recipes", recipe);
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recipes", id);
}

/** Replace the entire store (used by backup import). */
export async function replaceAllRecipes(recipes: Recipe[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("recipes", "readwrite");
  await tx.store.clear();
  for (const r of recipes) await tx.store.put(r);
  await tx.done;
}

/** Merge recipes without wiping existing ones (used by "save shared recipe"). */
export async function addRecipes(recipes: Recipe[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("recipes", "readwrite");
  for (const r of recipes) await tx.store.put(r);
  await tx.done;
}
