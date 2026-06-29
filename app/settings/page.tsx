"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getAllRecipes, replaceAllRecipes } from "@/lib/db";
import type { BackupFile, Recipe } from "@/lib/types";
import { downloadJson } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import {
  backupToCloud,
  restoreFromCloud,
  NO_BACKUP,
} from "@/lib/cloudBackup";
import { PageHeader, outlineBtnClass, primaryBtnClass } from "@/components/ui";

function isValidBackup(data: unknown): data is BackupFile {
  if (!data || typeof data !== "object") return false;
  const b = data as Partial<BackupFile>;
  return b.app === "metkonim" && Array.isArray(b.recipes);
}

export default function SettingsPage() {
  const { user, configured, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cloudBusy, setCloudBusy] = useState<"backup" | "restore" | null>(null);
  const [cloudMsg, setCloudMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function onCloudBackup() {
    if (!user) {
      setCloudMsg({ ok: false, text: "כדי לגבות או לשחזר צריך להתחבר עם מייל" });
      return;
    }
    setCloudBusy("backup");
    setCloudMsg(null);
    try {
      const count = await backupToCloud();
      setCloudMsg({ ok: true, text: `גובו ${count} מתכונים לענן בהצלחה.` });
    } catch {
      setCloudMsg({ ok: false, text: "הגיבוי לענן נכשל. נסו שוב." });
    } finally {
      setCloudBusy(null);
    }
  }

  async function onCloudRestore() {
    if (!user) {
      setCloudMsg({ ok: false, text: "כדי לגבות או לשחזר צריך להתחבר עם מייל" });
      return;
    }
    if (!confirm("השחזור יחליף את כל המתכונים המקומיים בגיבוי מהענן. להמשיך?")) {
      return;
    }
    setCloudBusy("restore");
    setCloudMsg(null);
    try {
      const count = await restoreFromCloud();
      setCloudMsg({ ok: true, text: `שוחזרו ${count} מתכונים מהענן בהצלחה.` });
    } catch (err) {
      const text =
        err instanceof Error && err.message === NO_BACKUP
          ? "לא נמצא גיבוי בענן עבור החשבון הזה."
          : "השחזור מהענן נכשל. נסו שוב.";
      setCloudMsg({ ok: false, text });
    } finally {
      setCloudBusy(null);
    }
  }

  async function onExport() {
    const recipes = await getAllRecipes();
    const backup: BackupFile = {
      app: "metkonim",
      version: 1,
      exportedAt: Date.now(),
      recipes,
    };
    downloadJson(`recipes-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!isValidBackup(data)) {
        setMsg({ ok: false, text: "הקובץ אינו קובץ גיבוי תקין." });
        return;
      }
      const count = (data.recipes as Recipe[]).length;
      const ok = confirm(
        `הייבוא יחליף את כל המתכונים הקיימים (${count} מתכונים בקובץ). להמשיך?`
      );
      if (!ok) return;
      await replaceAllRecipes(data.recipes as Recipe[]);
      setMsg({ ok: true, text: `יובאו ${count} מתכונים בהצלחה.` });
    } catch {
      setMsg({ ok: false, text: "קריאת הקובץ נכשלה. ודאו שזה קובץ JSON תקין." });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="הגדרות" />

      {/* Account */}
      <section className="bg-surface border border-border rounded-[var(--radius-app)] p-4">
        <h2 className="font-bold mb-1">חשבון</h2>
        {!configured ? (
          <p className="text-sm text-muted leading-relaxed">
            התחברות עם Supabase אינה מוגדרת עדיין. המתכונים נשמרים מקומית במכשיר.
          </p>
        ) : user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              מחובר כ־<span className="font-medium text-foreground">{user.email}</span>
            </p>
            <button onClick={signOut} className={outlineBtnClass("w-full")}>
              התנתקות
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted leading-relaxed">
              התחברו כדי לזהות את החשבון שלכם (לגיבוי ושיתוף עתידיים).
            </p>
            <Link href="/auth" className={primaryBtnClass("w-full")}>
              התחברות / הרשמה
            </Link>
          </div>
        )}
      </section>

      {/* Backup */}
      <section className="bg-surface border border-border rounded-[var(--radius-app)] p-4 space-y-3">
        <h2 className="font-bold">גיבוי ושחזור</h2>
        <p className="text-sm text-muted leading-relaxed">
          ייצוא שומר את כל המתכונים לקובץ JSON. ייבוא יחליף את המתכונים הקיימים.
        </p>
        <button onClick={onExport} className={primaryBtnClass("w-full")}>
          ⬆️ ייצוא גיבוי
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className={outlineBtnClass("w-full")}
        >
          ⬇️ ייבוא מגיבוי
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = "";
          }}
        />
        {msg && (
          <p
            className={`text-sm text-center ${
              msg.ok ? "text-accent" : "text-red-500"
            }`}
          >
            {msg.text}
          </p>
        )}
      </section>

      {/* Cloud backup */}
      <section className="bg-surface border border-border rounded-[var(--radius-app)] p-4 space-y-3">
        <h2 className="font-bold">גיבוי בענן</h2>
        {!configured ? (
          <p className="text-sm text-muted leading-relaxed">
            התחברות Supabase אינה מוגדרת עדיין
          </p>
        ) : !user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted leading-relaxed">
              כדי לגבות או לשחזר צריך להתחבר עם מייל
            </p>
            <Link href="/auth" className={primaryBtnClass("w-full")}>
              התחברות / הרשמה
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted leading-relaxed">
              גיבוי שומר את כל המתכונים שלך בחשבון בענן. שחזור מחליף את המתכונים
              המקומיים בגיבוי האחרון מהענן.
            </p>
            <button
              onClick={onCloudBackup}
              disabled={cloudBusy !== null}
              className={primaryBtnClass("w-full")}
            >
              {cloudBusy === "backup" ? "מגבה…" : "☁️ גבה לענן"}
            </button>
            <button
              onClick={onCloudRestore}
              disabled={cloudBusy !== null}
              className={outlineBtnClass("w-full")}
            >
              {cloudBusy === "restore" ? "משחזר…" : "⬇️ שחזר מהענן"}
            </button>
          </>
        )}
        {cloudMsg && (
          <p
            className={`text-sm text-center ${
              cloudMsg.ok ? "text-accent" : "text-red-500"
            }`}
          >
            {cloudMsg.text}
          </p>
        )}
      </section>

      <p className="text-center text-xs text-muted">מתכונים · גרסה 1.0</p>
    </div>
  );
}
