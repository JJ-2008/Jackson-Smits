import type { AppState, Settings } from "../types";

const KEY = "cutting-tracker:v1";

export const DEFAULT_SETTINGS: Settings = {
  targets: { calories: 2400, protein: 200, carbs: 235, fat: 70 },
  weightUnit: "kg",
  autoTargets: false,
  accutaneMode: false,
  favourites: [],
  mealTimes: { Breakfast: 8, Lunch: 13, Dinner: 19, Snacks: 16 },
};

export function defaultState(): AppState {
  return { days: {}, settings: { ...DEFAULT_SETTINGS } };
}

export function loadState(): AppState {
  if (typeof localStorage === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      days: parsed.days ?? {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        targets: { ...DEFAULT_SETTINGS.targets, ...parsed.settings?.targets },
        mealTimes: { ...DEFAULT_SETTINGS.mealTimes, ...parsed.settings?.mealTimes },
      },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full / unavailable — fail silently
  }
}
