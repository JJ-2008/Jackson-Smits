# Cut — Daily Nutrition & Cutting Tracker

A clean, modern, mobile-first nutrition tracker built for cutting (losing body
fat while keeping muscle). Tell it what you ate in plain English and it tracks
your calories and macros, tells you what's left, and suggests what — and when —
to eat next.

## Highlights

- **Natural-language logging** — type _"200g chicken breast and 250g cooked rice"_
  or _"3 eggs in an omelette and 3 cups of lemon water"_ and it's parsed,
  estimated, and added automatically.
- **Large calorie ring + macro cards** — calories consumed / target and
  protein · carbs · fat at a glance, with smooth progress bars.
- **What to eat next** — remaining calories & macros, a realistic suggested
  plate with serving sizes, and a recommended time for your next meal.
- **Meals grouped** into Breakfast / Lunch / Dinner / Snacks, each item
  editable and deletable.
- **Daily history & weekly overview** — averages, trends, and whether you hit
  your targets.
- **Bodyweight tracking** — morning weight, 7-day average, weekly rate of loss,
  and warnings if you're dropping too fast or stalling.
- **Cutting logic** — prioritises protein, keeps you near your calorie target,
  ensures enough dietary fat, and fills the rest with carbs. Never recommends
  extreme restriction.
- **Persists locally** — all data is saved to your browser (`localStorage`), so
  it's there when you come back. No account, no server.

## Default daily targets

| Calories | Protein | Carbs | Fat  |
| -------- | ------- | ----- | ---- |
| 2,400    | 200 g   | 235 g | 70 g |

Tap the ⚙ icon to change them.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
npm test         # run the parser / logic test suite (Vitest)
```

## How it works

- **`src/data/foods.ts`** — a database of ~90 common foods with sensible
  standard nutrition values (per 100 g, per 100 ml, or per item). All values
  are estimates and are clearly flagged in the UI (the `EST` tag) so you can
  correct them.
- **`src/lib/parser.ts`** — splits free text into individual foods, extracts
  quantities (grams, ml, cups, slices, counts, number words…), matches them to
  the database, and scales the macros.
- **`src/lib/suggest.ts`** — the cutting engine that turns your remaining
  budget into a realistic next meal and timing.
- **`src/lib/weight.ts`** — bodyweight averaging, trend, and rate-of-loss
  warnings.
- **`src/lib/storage.ts`** — `localStorage` persistence.

Estimates are exactly that — estimates. Tap any food to fine-tune its
quantity or macros; your correction replaces the estimate.

## Tech

React + TypeScript + Vite. No UI framework — hand-built dark-mode design system
in `src/styles.css`. State lives in a single store hook (`src/hooks/useStore.ts`)
and persists to `localStorage`.
