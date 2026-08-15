import type { AppState, DayLog, Targets } from "../types";
import { dayTotals } from "./nutrition";
import { isJunk } from "../data/foodTags";
import { recentDayKeys } from "./date";

export interface DayStatus {
  date: string;
  logged: boolean;
  hitGoals: boolean;
  clean: boolean; // no junk food logged
  perfect: boolean; // hit goals AND clean
}

function foodIsJunk(name: string, flag?: boolean): boolean {
  return flag === true || (flag === undefined && isJunk(name));
}

export function dayStatus(day: DayLog | undefined, targets: Targets): DayStatus {
  const date = day?.date ?? "";
  if (!day || day.foods.length === 0) {
    return { date, logged: false, hitGoals: false, clean: false, perfect: false };
  }
  const t = dayTotals(day);
  const proteinOk = t.protein >= targets.protein * 0.95;
  const calOk = Math.abs(t.calories - targets.calories) <= targets.calories * 0.1;
  const hitGoals = proteinOk && calOk;
  const clean = !day.foods.some((f) => foodIsJunk(f.name, f.junk));
  return { date, logged: true, hitGoals, clean, perfect: hitGoals && clean };
}

export interface StreakSummary {
  statuses: DayStatus[]; // oldest -> newest
  cleanStreak: number; // consecutive clean days ending today
  goalStreak: number; // consecutive goal-hit days ending today
  perfectStreak: number; // consecutive perfect days ending today
  cleanDays: number; // clean days in window
  goalDays: number; // goal-hit days in window
  perfectDays: number; // perfect days in window
  loggedDays: number;
}

/** Count a trailing streak over statuses (newest last). */
function trailingStreak(statuses: DayStatus[], pick: (s: DayStatus) => boolean): number {
  let n = 0;
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (!statuses[i].logged) break; // an unlogged day breaks the streak
    if (pick(statuses[i])) n++;
    else break;
  }
  return n;
}

export function streakSummary(
  state: AppState,
  days: number,
  end: string
): StreakSummary {
  const keys = recentDayKeys(days, end); // oldest -> newest
  const targets = state.settings.targets;
  // Always stamp the real date key so unlogged days keep unique identities.
  const statuses = keys.map((k) => ({ ...dayStatus(state.days[k], targets), date: k }));

  return {
    statuses,
    cleanStreak: trailingStreak(statuses, (s) => s.clean),
    goalStreak: trailingStreak(statuses, (s) => s.hitGoals),
    perfectStreak: trailingStreak(statuses, (s) => s.perfect),
    cleanDays: statuses.filter((s) => s.clean).length,
    goalDays: statuses.filter((s) => s.hitGoals).length,
    perfectDays: statuses.filter((s) => s.perfect).length,
    loggedDays: statuses.filter((s) => s.logged).length,
  };
}
