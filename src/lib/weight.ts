import type { AppState, WeightUnit } from "../types";
import { addDays, toDateKey } from "./date";

export interface WeightPoint {
  date: string;
  weight: number;
}

/** Collect all recorded bodyweights in chronological order. */
export function weightSeries(state: AppState): WeightPoint[] {
  return Object.values(state.days)
    .filter((d) => typeof d.bodyweight === "number")
    .map((d) => ({ date: d.date, weight: d.bodyweight as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function averageOverWindow(
  state: AppState,
  endKey: string,
  days: number
): number | undefined {
  const vals: number[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDays(endKey, -i);
    const w = state.days[key]?.bodyweight;
    if (typeof w === "number") vals.push(w);
  }
  if (!vals.length) return undefined;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export interface WeightSummary {
  today?: number;
  avg7?: number;
  prevAvg7?: number;
  /** kg (or lb) change per week based on 7-day averages. */
  weeklyRate?: number;
  unit: WeightUnit;
  trend: "down" | "up" | "flat" | "none";
  warning?: string;
}

export function weightSummary(
  state: AppState,
  endKey: string = toDateKey()
): WeightSummary {
  const unit = state.settings.weightUnit;
  const today = state.days[endKey]?.bodyweight;
  const avg7 = averageOverWindow(state, endKey, 7);
  const prevAvg7 = averageOverWindow(state, addDays(endKey, -7), 7);

  let weeklyRate: number | undefined;
  if (avg7 !== undefined && prevAvg7 !== undefined) {
    weeklyRate = avg7 - prevAvg7;
  }

  let trend: WeightSummary["trend"] = "none";
  if (weeklyRate !== undefined) {
    if (weeklyRate < -0.1) trend = "down";
    else if (weeklyRate > 0.1) trend = "up";
    else trend = "flat";
  }

  // Healthy cut ~ 0.5-1.0% of bodyweight per week.
  let warning: string | undefined;
  const bw = avg7 ?? today;
  if (weeklyRate !== undefined && bw) {
    const lossKg = -weeklyRate * (unit === "lb" ? 0.4536 : 1);
    const bwKg = bw * (unit === "lb" ? 0.4536 : 1);
    const pctPerWeek = (lossKg / bwKg) * 100;
    if (pctPerWeek > 1.0) {
      warning =
        "You're losing weight quite fast. Dropping this quickly risks muscle loss — consider adding ~150–250 kcal, mostly from protein and carbs.";
    } else if (pctPerWeek < 0.1 && pctPerWeek >= -0.3) {
      warning =
        "Weight loss has stalled. If you want to keep cutting, tighten your logging or trim ~150 kcal from carbs/fat.";
    } else if (pctPerWeek < -0.3) {
      warning =
        "Weight is trending up. If you're aiming to cut, revisit your calorie target or portion sizes.";
    }
  }

  return { today, avg7, prevAvg7, weeklyRate, unit, trend, warning };
}
