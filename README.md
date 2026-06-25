# מתכונים — Recipes PWA

אפליקציית מתכונים אישית בעברית, RTL, mobile-first, הניתנת להתקנה למסך הבית (PWA).

A clean, lightweight Hebrew (RTL) recipe manager. Recipes are stored locally on
the device (IndexedDB). Optional Supabase email auth is supported.

## Stack

- **Next.js 16** (App Router, static export)
- **React 19 + TypeScript**
- **Tailwind CSS v4**
- **IndexedDB** (`idb`) for recipes + photos — persists across refresh
- **Supabase** email auth (optional)
- **lz-string** for self-contained share links (no backend needed)

## Features

- מסך בית: "המתכונים המובילים שלי" (לפי מספר ההכנות) + כפתורי השראה
- רשימת מתכונים עם חיפוש לפי שם וסינון לפי קטגוריה
- עמוד מתכון: מצרכים כבועות, "מצרכים להמשך הבישול", שלבי הכנה ממוספרים, סרטון,
  גלריית תמונות, הערות, דירוג 1–5, מונה "הכנתי את המתכון"
- טופס הוספה/עריכה ידידותי למובייל
- גיבוי/שחזור ל-JSON
- שיתוף מתכון בקישור עם תצוגה מקדימה וכפתור "שמור למתכונים שלי"
- אימות מייל עם Supabase (אופציונלי)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build (static export → `out/`)

```bash
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in if you want auth:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

The app works fully without these — recipes stay local.

## Deploy to Netlify

1. Push this repo to GitHub.
2. In Netlify: **New site from Git** → pick the repo.
3. Build command `npm run build`, publish directory `out` (already in
   `netlify.toml`).
4. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars if using auth.

## Notes / next stage

- Recipe data is local-only for now; Supabase is wired for auth and ready for
  future cloud sync/sharing.
- Share links embed the recipe (compressed in the URL). Photos are included
  only when the link stays small; full photo sharing can be completed later.
