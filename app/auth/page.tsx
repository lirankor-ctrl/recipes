"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { PageHeader, primaryBtnClass } from "@/components/ui";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, configured, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // After email confirmation the user returns to /auth and the Supabase client
  // restores the session — once signed in, move on to Settings.
  useEffect(() => {
    if (!loading && user) router.replace("/settings");
  }, [loading, user, router]);

  async function onForgotPassword() {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("יש להזין כתובת מייל לאיפוס הסיסמה.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setInfo("אם הכתובת קיימת, שלחנו אליך מייל לאיפוס הסיסמה. בדקו את תיבת הדואר.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const needsConfirmation = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setInfo("נשלח אליך מייל לאימות החשבון. לאחר האימות אפשר להתחבר.");
        } else {
          // Email confirmation disabled — the user is already signed in.
          router.push("/settings");
        }
      } else {
        await signIn(email.trim(), password);
        router.push("/settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={mode === "login" ? "התחברות" : "הרשמה"} />

      {!configured && (
        <div className="bg-primary-soft text-sm text-foreground rounded-2xl p-4 leading-relaxed">
          <p className="font-semibold mb-1">התחברות Supabase אינה מוגדרת עדיין</p>
          הוסיפו את משתני הסביבה
          <span dir="ltr" className="block font-mono text-xs mt-1">
            NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
          </span>
          האפליקציה תמשיך לעבוד ולשמור מתכונים מקומית גם בלי התחברות.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="כתובת מייל"
          dir="ltr"
          className={inputClass}
          disabled={!configured || busy}
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה (לפחות 6 תווים)"
          dir="ltr"
          className={inputClass}
          disabled={!configured || busy}
        />
        <button
          type="submit"
          disabled={!configured || busy}
          className={primaryBtnClass("w-full")}
        >
          {busy ? "רגע…" : mode === "login" ? "התחברות" : "הרשמה"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {info && <p className="text-sm text-accent text-center">{info}</p>}

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
          setInfo("");
        }}
        className="w-full text-sm text-primary font-medium py-2"
      >
        {mode === "login" ? "אין לך חשבון? הרשמה" : "יש לך חשבון? התחברות"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={!configured || busy}
          className="w-full text-sm text-muted py-1 disabled:opacity-60"
        >
          שכחתי סיסמה
        </button>
      )}
    </div>
  );
}

const inputClass =
  "w-full bg-surface border border-border rounded-2xl px-4 py-3 text-[15px] outline-none focus:border-primary disabled:opacity-60";
