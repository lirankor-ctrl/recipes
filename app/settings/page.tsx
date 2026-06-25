"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getAllRecipes, replaceAllRecipes } from "@/lib/db";
import type { BackupFile, Recipe } from "@/lib/types";
import { downloadJson } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
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

      <p className="text-center text-xs text-muted">מתכונים · גרסה 1.0</p>
    </div>
  );
}
