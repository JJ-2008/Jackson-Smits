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
  junk?: boolean; // flagged as junk / acne-promoting
  photo?: string; // optional data-URL thumbnail
  source?: "text" | "barcode" | "manual" | "photo"; // how it was added
}

/** A logged workout / activity. */
export interface ExerciseEntry {
  id: string;
  description: string; // display label e.g. "5 km run"
  type: string; // matched activity, e.g. "Running"
  minutes?: number; // duration if known
  calories: number; // estimated calories burned
  strength: boolean; // resistance training (affects protein bump)
  createdAt: number; // epoch ms
}

/** All data recorded for a single calendar day. */
export interface DayLog {
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  exercises?: ExerciseEntry[];
  bodyweight?: number; // kg or lb depending on settings.weightUnit
}

export interface Targets extends Macros {}

export type WeightUnit = "kg" | "lb";

export type Sex = "male" | "female";
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalType = "cut" | "recomp" | "maintain" | "lean_bulk";

/** Personal profile used to calculate targets automatically. */
export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalType;
  goalText?: string; // free-text description the user typed
}

export interface Settings {
  targets: Targets;
  weightUnit: WeightUnit;
  autoTargets: boolean; // if true, targets are derived from the profile
  profile?: Profile;
  accutaneMode: boolean; // show the "take Accutane with fattiest meal" helper
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
