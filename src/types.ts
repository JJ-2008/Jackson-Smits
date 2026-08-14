export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A single logged food item. */
export interface FoodEntry extends Macros {
  id: string;
  name: string; // display label e.g. "Chicken breast"
  quantity: string; // human readable quantity e.g. "200 g", "3"
  meal: MealType;
  estimated: boolean; // true if macros were auto-estimated (vs user-edited)
  createdAt: number; // epoch ms
}

/** All data recorded for a single calendar day. */
export interface DayLog {
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  bodyweight?: number; // kg or lb depending on settings.units
}

export interface Targets extends Macros {}

export type WeightUnit = "kg" | "lb";

export interface Settings {
  targets: Targets;
  weightUnit: WeightUnit;
  // approximate meal window start hours (24h)
  mealTimes: {
    Breakfast: number;
    Lunch: number;
    Dinner: number;
    Snacks: number;
  };
}

export interface AppState {
  days: Record<string, DayLog>; // keyed by date
  settings: Settings;
}
