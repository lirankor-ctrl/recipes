// Cloud backup/restore for the logged-in user, backed by the Supabase
// `recipe_backups` table (see supabase/schema.sql). One backup row per user:
// "גבה לענן" upserts it, "שחזר מהענן" reads the latest and restores locally.
// Local-first behavior is untouched — this is purely additive.

"use client";

import { getSupabase } from "./supabase";
import { getAllRecipes, replaceAllRecipes } from "./db";
import type { Recipe } from "./types";

const TABLE = "recipe_backups";

/** Shape stored in the `backup_data` jsonb column. */
interface CloudBackupPayload {
  app: "metkonim";
  version: 1;
  exportedAt: number;
  recipes: Recipe[];
}

/** Thrown when an action needs a signed-in user. */
export const NOT_AUTHENTICATED = "not-authenticated";
/** Thrown by restore when the user has no backup yet. */
export const NO_BACKUP = "no-backup";

async function requireUserId(): Promise<{ supabase: NonNullable<ReturnType<typeof getSupabase>>; userId: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase לא מוגדר");
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error(NOT_AUTHENTICATED);
  return { supabase, userId: user.id };
}

/** Upload all local recipes as the user's single cloud backup. Returns count. */
export async function backupToCloud(): Promise<number> {
  const { supabase, userId } = await requireUserId();
  const recipes = await getAllRecipes();
  const payload: CloudBackupPayload = {
    app: "metkonim",
    version: 1,
    exportedAt: Date.now(),
    recipes,
  };

  // Keep one row per user: update if it exists, otherwise insert.
  const { data: existing, error: findErr } = await supabase
    .from(TABLE)
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const { error } = await supabase
      .from(TABLE)
      .update({ backup_data: payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, backup_data: payload });
    if (error) throw error;
  }

  return recipes.length;
}

/** Download the user's latest cloud backup and replace local recipes. Returns count. */
export async function restoreFromCloud(): Promise<number> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .select("backup_data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(NO_BACKUP);

  const payload = data.backup_data as CloudBackupPayload | null;
  const recipes = Array.isArray(payload?.recipes) ? payload!.recipes : [];
  await replaceAllRecipes(recipes);
  return recipes.length;
}
