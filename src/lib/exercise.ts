import type { ExerciseEntry, Macros, Targets } from "../types";

/**
 * Estimate calories burned from a natural-language workout description and
 * work out what it means for the day's remaining diet.
 *
 * Burn is estimated with MET values (calories/hour ≈ MET × bodyweight-kg),
 * or a distance formula when a distance is given. All values are estimates.
 */

interface Activity {
  type: string;
  keywords: string[];
  met: number;
  strength?: boolean;
  /** kcal per kg per km, when a distance is supplied. */
  perKgKm?: number;
  defaultMinutes: number;
}

const ACTIVITIES: Activity[] = [
  { type: "Running", keywords: ["run", "running", "jog", "jogging", "5k", "10k", "parkrun", "sprint"], met: 9.8, perKgKm: 0.95, defaultMinutes: 30 },
  { type: "Cycling", keywords: ["cycle", "cycling", "bike", "biking", "spin", "spinning", "peloton"], met: 7.5, perKgKm: 0.28, defaultMinutes: 40 },
  { type: "Walking", keywords: ["walk", "walking", "hike", "hiking", "steps"], met: 3.5, perKgKm: 0.5, defaultMinutes: 45 },
  { type: "Weights", keywords: ["weights", "lifting", "lift", "gym", "resistance", "strength", "push day", "pull day", "leg day", "upper", "lower", "bodybuilding"], met: 5, strength: true, defaultMinutes: 45 },
  { type: "HIIT", keywords: ["hiit", "circuit", "crossfit", "bootcamp", "metcon"], met: 8, strength: true, defaultMinutes: 30 },
  { type: "Swimming", keywords: ["swim", "swimming", "laps"], met: 8.3, defaultMinutes: 40 },
  { type: "Football", keywords: ["football", "soccer", "5-a-side", "5 a side"], met: 7, defaultMinutes: 60 },
  { type: "Basketball", keywords: ["basketball", "hoops"], met: 6.5, defaultMinutes: 45 },
  { type: "Rowing", keywords: ["row", "rowing", "erg"], met: 7, strength: true, defaultMinutes: 30 },
  { type: "Boxing", keywords: ["box", "boxing", "sparring", "bag work", "muay thai", "mma"], met: 9, defaultMinutes: 40 },
  { type: "Tennis", keywords: ["tennis", "padel", "squash", "badminton"], met: 7, defaultMinutes: 60 },
  { type: "Yoga", keywords: ["yoga", "pilates", "stretch", "stretching", "mobility"], met: 3, defaultMinutes: 40 },
  { type: "Elliptical", keywords: ["elliptical", "cross trainer", "stairmaster", "stair", "cardio"], met: 5, defaultMinutes: 30 },
  { type: "Sport", keywords: ["rugby", "hockey", "netball", "cricket", "climbing", "skiing", "dance", "dancing"], met: 6.5, defaultMinutes: 45 },
];

const DEFAULT_ACTIVITY: Activity = { type: "Workout", keywords: [], met: 5, defaultMinutes: 40 };

function matchActivity(text: string): Activity {
  const t = text.toLowerCase();
  let best: { a: Activity; len: number } | undefined;
  for (const a of ACTIVITIES) {
    for (const k of a.keywords) {
      if (t.includes(k) && (!best || k.length > best.len)) best = { a, len: k.length };
    }
  }
  return best?.a ?? DEFAULT_ACTIVITY;
}

function parseMinutes(text: string): number | undefined {
  const t = text.toLowerCase();
  let mins = 0;
  let found = false;
  const hr = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
  if (hr) {
    mins += parseFloat(hr[1]) * 60;
    found = true;
  }
  const mn = t.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b/);
  if (mn) {
    mins += parseFloat(mn[1]);
    found = true;
  }
  if (/\bhalf an hour\b/.test(t)) return 30;
  if (/\ban hour\b/.test(t) && !found) return 60;
  return found ? Math.round(mins) : undefined;
}

function parseDistanceKm(text: string): number | undefined {
  const t = text.toLowerCase();
  const km = t.match(/(\d+(?:\.\d+)?)\s*(km|kms|kilometers?|kilometres?|k)\b/);
  if (km) return parseFloat(km[1]);
  const mi = t.match(/(\d+(?:\.\d+)?)\s*(miles?|mi)\b/);
  if (mi) return parseFloat(mi[1]) * 1.609;
  return undefined;
}

function parseSteps(text: string): number | undefined {
  const m = text.toLowerCase().replace(/,/g, "").match(/(\d{3,6})\s*steps/);
  return m ? parseInt(m[1]) : undefined;
}

export interface ParsedExercise {
  description: string;
  type: string;
  minutes?: number;
  calories: number;
  strength: boolean;
}

/** Split a free-text description into individual activities. */
function splitActivities(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/\n/g, ",")
    .split(/,|;|\band\b|\bthen\b|\+|&/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

function estimateOne(phrase: string, weightKg: number): ParsedExercise | null {
  if (!phrase.trim()) return null;
  const activity = matchActivity(phrase);
  const km = parseDistanceKm(phrase);
  const steps = parseSteps(phrase);
  let minutes = parseMinutes(phrase);

  let calories = 0;
  let label = phrase.trim();

  if (steps && activity.type === "Walking") {
    const distKm = steps / 1330;
    calories = 0.5 * weightKg * distKm;
    label = `${steps.toLocaleString()} steps`;
    if (!minutes) minutes = Math.round(distKm * 11); // ~11 min/km walking
  } else if (km && activity.perKgKm) {
    calories = activity.perKgKm * weightKg * km;
    label = `${trim(km)} km ${activity.type.toLowerCase()}`;
    if (!minutes) {
      const pace = activity.type === "Running" ? 6 : activity.type === "Cycling" ? 2.5 : 11;
      minutes = Math.round(km * pace);
    }
  } else {
    const mins = minutes ?? activity.defaultMinutes;
    calories = activity.met * weightKg * (mins / 60);
    minutes = mins;
    label = titleCase(phrase.trim());
  }

  return {
    description: label,
    type: activity.type,
    minutes,
    calories: Math.round(calories),
    strength: !!activity.strength,
  };
}

export function parseExerciseText(text: string, weightKg: number): ParsedExercise[] {
  return splitActivities(text)
    .map((p) => estimateOne(p, weightKg))
    .filter((x): x is ParsedExercise => x !== null && x.calories > 0);
}

export function totalBurn(exercises: ExerciseEntry[] | undefined): number {
  if (!exercises) return 0;
  return exercises.reduce((a, e) => a + e.calories, 0);
}

export function hadStrength(exercises: ExerciseEntry[] | undefined): boolean {
  return !!exercises?.some((e) => e.strength);
}

/**
 * Apply the "add it all back" policy: the full burn is added to the day's
 * budget, mostly as carbs to refuel, plus a little protein for recovery.
 */
export function exerciseAdjustedTargets(
  base: Targets,
  burn: number,
  strength: boolean
): Targets {
  if (burn <= 0) return base;
  const extraProtein = strength ? 15 : 5;
  const extraCarbs = Math.max(0, Math.round((burn - extraProtein * 4) / 4));
  return {
    calories: base.calories + Math.round(burn),
    protein: base.protein + extraProtein,
    carbs: base.carbs + extraCarbs,
    fat: base.fat,
  };
}

/** The extra macros unlocked by today's exercise (for display). */
export function exerciseBonus(base: Targets, adjusted: Targets): Macros {
  return {
    calories: adjusted.calories - base.calories,
    protein: adjusted.protein - base.protein,
    carbs: adjusted.carbs - base.carbs,
    fat: adjusted.fat - base.fat,
  };
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
