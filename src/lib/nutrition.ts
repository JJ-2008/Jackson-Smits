import type { DayLog, FoodEntry, Macros, MealType, Targets } from "../types";

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { ...EMPTY_MACROS }
  );
}

export function dayTotals(day: DayLog | undefined): Macros {
  if (!day) return { ...EMPTY_MACROS };
  return roundMacros(sumMacros(day.foods));
}

export function remaining(totals: Macros, targets: Targets): Macros {
  return {
    calories: targets.calories - totals.calories,
    protein: targets.protein - totals.protein,
    carbs: targets.carbs - totals.carbs,
    fat: targets.fat - totals.fat,
  };
}

export function roundMacros(m: Macros): Macros {
  return {
    calories: Math.round(m.calories),
    protein: Math.round(m.protein * 10) / 10,
    carbs: Math.round(m.carbs * 10) / 10,
    fat: Math.round(m.fat * 10) / 10,
  };
}

export function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

export function groupByMeal(foods: FoodEntry[]): Record<MealType, FoodEntry[]> {
  const groups: Record<MealType, FoodEntry[]> = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: [],
  };
  for (const f of foods) groups[f.meal].push(f);
  return groups;
}

/** kcal derived purely from macros — used to sanity check estimates. */
export function macroCalories(m: Macros): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}
