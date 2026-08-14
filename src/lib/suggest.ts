import type { FoodEntry, Macros, MealType, Targets } from "../types";
import { remaining, roundMacros } from "./nutrition";

export interface SuggestionItem {
  food: string;
  amount: string;
}

export interface Suggestion {
  meal: MealType;
  time: string; // e.g. "1:00 PM"
  items: SuggestionItem[];
  macros: Macros; // approx macros of the suggested meal
  note: string;
  remaining: Macros;
}

/** Which meals still lie ahead given the meals already eaten and the time. */
function nextMealSlot(eatenMeals: Set<MealType>, hour: number): MealType {
  if (!eatenMeals.has("Breakfast") && hour < 11) return "Breakfast";
  if (!eatenMeals.has("Lunch") && hour < 15) return "Lunch";
  if (!eatenMeals.has("Dinner") && hour < 22) return "Dinner";
  if (!eatenMeals.has("Lunch")) return "Lunch";
  if (!eatenMeals.has("Dinner")) return "Dinner";
  return "Snacks";
}

function fmtTime(hour: number, minute = 0): string {
  const h = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 || hour === 24 ? "AM" : "PM";
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

/**
 * Suggest the next meal following cutting priorities:
 *   1. Protein  2. Hit the calorie target  3. Enough fat  4. Carbs fill the rest
 */
export function suggestNextMeal(
  foods: FoodEntry[],
  targets: Targets,
  now: Date = new Date()
): Suggestion {
  const totals = foods.reduce(
    (a, f) => ({
      calories: a.calories + f.calories,
      protein: a.protein + f.protein,
      carbs: a.carbs + f.carbs,
      fat: a.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const left = remaining(totals, targets);
  const eaten = new Set(foods.map((f) => f.meal));
  const hour = now.getHours();

  // How many eating occasions likely remain today?
  const slotsLeft = Math.max(
    1,
    (!eaten.has("Lunch") && hour < 15 ? 1 : 0) +
      (!eaten.has("Dinner") && hour < 22 ? 1 : 0) +
      (hour < 20 ? 1 : 0) // an evening snack
  );

  const meal = nextMealSlot(eaten, hour);

  // Recommended time: aim ~3h after the last meal, clamped to sensible windows.
  const lastMealAt = foods.length
    ? Math.max(...foods.map((f) => f.createdAt))
    : now.getTime();
  const targetTimeMs = Math.max(now.getTime() + 15 * 60000, lastMealAt + 3 * 3600000);
  const t = new Date(targetTimeMs);
  const roundedMin = t.getMinutes() < 30 ? 0 : 30;

  // Target for THIS meal: front-load protein, spread calories across remaining slots.
  const mealCals = Math.max(250, Math.round(left.calories / slotsLeft));
  // Protein: try to knock out a bigger share now (muscle retention priority).
  const proteinShare = slotsLeft <= 1 ? 1 : 0.55;
  let mealProtein = Math.max(0, Math.round(left.protein * proteinShare));
  const mealFat = Math.max(0, Math.round((left.fat / slotsLeft) * 0.9));

  // Carbs fill whatever calories remain after protein + fat.
  let mealCarbs = Math.max(
    0,
    Math.round((mealCals - mealProtein * 4 - mealFat * 9) / 4)
  );

  // Guard rails so the numbers stay realistic.
  if (mealProtein > 70) mealProtein = 70;
  if (mealCarbs > 120) mealCarbs = 120;

  const items = buildPlate(mealProtein, mealCarbs, mealFat, meal);
  const macros = roundMacros({
    calories: mealProtein * 4 + mealCarbs * 4 + mealFat * 9,
    protein: mealProtein,
    carbs: mealCarbs,
    fat: mealFat,
  });

  const note = buildNote(left, targets);

  return {
    meal,
    time: fmtTime(t.getHours(), roundedMin),
    items,
    macros,
    note,
    remaining: roundMacros(left),
  };
}

/** Compose a realistic plate hitting the target protein / carbs / fat. */
function buildPlate(
  protein: number,
  carbs: number,
  fat: number,
  meal: MealType
): SuggestionItem[] {
  const items: SuggestionItem[] = [];

  if (meal === "Breakfast") {
    if (protein > 0) {
      const eggs = Math.max(1, Math.round(protein / 12));
      items.push({ food: "Eggs", amount: `${eggs} whole` });
      const remP = protein - eggs * 6.3;
      if (remP > 15)
        items.push({ food: "Greek yogurt", amount: `${Math.round((remP / 10) * 100)} g` });
    }
    if (carbs > 0) {
      const oats = Math.round((carbs / 66) * 100);
      items.push({ food: "Oats", amount: `${Math.max(30, oats)} g` });
    }
  } else {
    // Lean protein source
    if (protein > 0) {
      const grams = Math.round((protein / 31) * 100); // chicken breast basis
      items.push({ food: "Chicken breast", amount: `${grams} g` });
    }
    // Carb source
    if (carbs > 0) {
      const grams = Math.round((carbs / 28) * 100); // cooked rice basis
      items.push({ food: "Cooked rice", amount: `${grams} g` });
    }
    // Veg for volume / micros
    items.push({ food: "Vegetables", amount: "1 large handful" });
  }

  // Added fat if we still need it (and it isn't already covered).
  const fatFromPlate = items.length * 3;
  if (fat - fatFromPlate > 6) {
    const grams = Math.round(((fat - fatFromPlate) / 100) * 100); // olive oil ~100g fat/100g
    items.push({ food: "Olive oil / nuts", amount: `${Math.max(5, grams)} g` });
  }

  return items.length ? items : [{ food: "A light balanced snack", amount: "1 serving" }];
}

function buildNote(left: Macros, targets: Targets): string {
  if (left.calories <= 50 && left.protein <= 10) {
    return "You're on target for today — nicely done. Keep any extra to protein or veg.";
  }
  if (left.calories < 0) {
    return "You're over your calorie target. Consider a lighter, high-protein option if you eat again.";
  }
  if (left.protein > targets.protein * 0.6) {
    return "Protein is the priority — lead this meal with a lean protein source.";
  }
  if (left.protein <= 15 && left.calories > 300) {
    return "Protein is nearly hit — you have room for carbs to fuel training.";
  }
  return "Balanced choice: prioritise protein, keep fat moderate, fill the rest with carbs.";
}
