import type { FoodEntry, Macros, MealType, Targets } from "../types";
import { remaining, roundMacros } from "./nutrition";

export interface SuggestionItem {
  food: string;
  amount: string;
}

export interface MealOption {
  label: string;
  items: SuggestionItem[];
  macros: Macros;
}

export interface AccutaneAdvice {
  mealName: string;
  fatGrams: number;
  planned: boolean; // true if based on the upcoming suggestion, not a logged meal
  text: string;
}

export interface NextMealResult {
  meal: MealType;
  time: string;
  remaining: Macros;
  note: string;
  options: MealOption[];
  accutane?: AccutaneAdvice;
}

interface Source extends Macros {
  name: string;
}

// Lean, acne-friendly protein sources (macros per 100 g cooked).
const PROTEINS: Source[] = [
  { name: "Chicken breast", protein: 31, carbs: 0, fat: 3.6, calories: 165 },
  { name: "Turkey breast", protein: 30, carbs: 0, fat: 1, calories: 135 },
  { name: "White fish (cod)", protein: 23, carbs: 0, fat: 1, calories: 105 },
  { name: "Salmon fillet", protein: 20, carbs: 0, fat: 13, calories: 208 },
  { name: "Tuna", protein: 26, carbs: 0, fat: 1, calories: 116 },
  { name: "King prawns", protein: 24, carbs: 0.2, fat: 0.3, calories: 99 },
  { name: "Firm tofu", protein: 8, carbs: 1.9, fat: 4.8, calories: 76 },
];

// Low-GI, acne-friendly carb sources (per 100 g cooked, oats per 100 g dry).
const CARBS: Source[] = [
  { name: "Brown rice", protein: 2.7, carbs: 26, fat: 1, calories: 123 },
  { name: "Sweet potato", protein: 2, carbs: 21, fat: 0.1, calories: 90 },
  { name: "Quinoa", protein: 4.4, carbs: 21, fat: 1.9, calories: 120 },
  { name: "New potatoes", protein: 2, carbs: 20, fat: 0.1, calories: 87 },
];

const VEG: Source = { name: "Mixed vegetables", protein: 2.5, carbs: 8, fat: 0.4, calories: 45 };
const OATS: Source = { name: "Oats", protein: 13, carbs: 66, fat: 7, calories: 389 };
const GREEK: Source = { name: "Greek yogurt (0%)", protein: 10, carbs: 4, fat: 0.4, calories: 62 };
const EGG = { protein: 6.3, carbs: 0.4, fat: 5, calories: 72 }; // per egg
const AVOCADO: Source = { name: "Avocado", protein: 2, carbs: 8, fat: 14.7, calories: 160 };
const ALMONDS: Source = { name: "Almonds", protein: 21, carbs: 22, fat: 50, calories: 579 };
const OLIVE_OIL: Source = { name: "Olive oil", protein: 0, carbs: 0, fat: 100, calories: 884 };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r5 = (n: number) => Math.round(n / 5) * 5;

function scaleSource(s: Source, grams: number): Macros {
  const f = grams / 100;
  return { calories: s.calories * f, protein: s.protein * f, carbs: s.carbs * f, fat: s.fat * f };
}

function sum(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Build a savoury plate from a protein + carb source hitting the macro budget. */
function buildPlate(
  protein: Source,
  carb: Source,
  need: { protein: number; carbs: number; fat: number }
): MealOption {
  const items: SuggestionItem[] = [];
  const parts: Macros[] = [];

  const pGrams = clamp(r5((need.protein / protein.protein) * 100), 80, 350);
  items.push({ food: protein.name, amount: `${pGrams} g` });
  parts.push(scaleSource(protein, pGrams));

  if (need.carbs > 5) {
    const cGrams = clamp(r5((need.carbs / carb.carbs) * 100), 50, 400);
    items.push({ food: carb.name, amount: `${cGrams} g` });
    parts.push(scaleSource(carb, cGrams));
  }

  items.push({ food: VEG.name, amount: "1 large handful" });
  parts.push(scaleSource(VEG, 100));

  // Top up fat with a clean source if we're short.
  const soFar = sum(parts);
  const fatGap = need.fat - soFar.fat;
  if (fatGap > 6) {
    // prefer avocado (skin-friendly fats); use oil for larger gaps
    if (fatGap < 16) {
      const g = clamp(r5((fatGap / AVOCADO.fat) * 100), 25, 100);
      items.push({ food: AVOCADO.name, amount: `${g} g` });
      parts.push(scaleSource(AVOCADO, g));
    } else {
      const g = clamp(r5((fatGap / OLIVE_OIL.fat) * 100), 5, 20);
      items.push({ food: `${OLIVE_OIL.name} / nuts`, amount: `${g} g` });
      parts.push(scaleSource(OLIVE_OIL, g));
    }
  }

  return {
    label: `${protein.name} & ${need.carbs > 5 ? carb.name.toLowerCase() : "veg"}`,
    items,
    macros: roundMacros(sum(parts)),
  };
}

function buildBreakfast(
  need: { protein: number; carbs: number; fat: number },
  variant: number
): MealOption {
  const items: SuggestionItem[] = [];
  const parts: Macros[] = [];

  if (variant % 2 === 0) {
    const eggs = clamp(Math.round(need.protein / 9), 2, 6);
    items.push({ food: "Whole eggs", amount: `${eggs}` });
    parts.push({
      calories: EGG.calories * eggs,
      protein: EGG.protein * eggs,
      carbs: EGG.carbs * eggs,
      fat: EGG.fat * eggs,
    });
    const remP = need.protein - eggs * EGG.protein;
    if (remP > 12) {
      const g = clamp(r5((remP / GREEK.protein) * 100), 100, 300);
      items.push({ food: GREEK.name, amount: `${g} g` });
      parts.push(scaleSource(GREEK, g));
    }
  } else {
    const g = clamp(r5((need.protein / GREEK.protein) * 100), 150, 350);
    items.push({ food: GREEK.name, amount: `${g} g` });
    parts.push(scaleSource(GREEK, g));
    items.push({ food: "Whey/oats blend", amount: "as needed" });
  }

  if (need.carbs > 8) {
    const g = clamp(r5((need.carbs / OATS.carbs) * 100), 30, 120);
    items.push({ food: OATS.name, amount: `${g} g (dry)` });
    parts.push(scaleSource(OATS, g));
  }
  items.push({ food: "Berries", amount: "1 handful" });
  parts.push({ calories: 30, protein: 0.5, carbs: 7, fat: 0.2 });

  const soFar = sum(parts);
  if (need.fat - soFar.fat > 6) {
    const g = clamp(r5(((need.fat - soFar.fat) / ALMONDS.fat) * 100), 10, 30);
    items.push({ food: ALMONDS.name, amount: `${g} g` });
    parts.push(scaleSource(ALMONDS, g));
  }

  return { label: variant % 2 === 0 ? "Eggs & oats" : "Yogurt bowl", items, macros: roundMacros(sum(parts)) };
}

function nextMealSlot(eaten: Set<MealType>, hour: number): MealType {
  if (!eaten.has("Breakfast") && hour < 11) return "Breakfast";
  if (!eaten.has("Lunch") && hour < 15) return "Lunch";
  if (!eaten.has("Dinner") && hour < 22) return "Dinner";
  if (!eaten.has("Lunch")) return "Lunch";
  if (!eaten.has("Dinner")) return "Dinner";
  return "Snacks";
}

function fmtTime(hour: number, minute = 0): string {
  const h = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 || hour === 24 ? "AM" : "PM";
  return `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Suggest the next meal (with several rerollable options) following cutting
 * priorities: protein first, hit the calorie target, enough fat, carbs fill
 * the rest — all from lean, acne-friendly foods.
 */
export function suggestNextMeal(
  foods: FoodEntry[],
  targets: Targets,
  now: Date = new Date(),
  accutaneMode = false
): NextMealResult {
  const totals = sum(foods);
  const left = remaining(totals, targets);
  const eaten = new Set(foods.map((f) => f.meal));
  const hour = now.getHours();
  const meal = nextMealSlot(eaten, hour);

  const slotsLeft = Math.max(
    1,
    (!eaten.has("Lunch") && hour < 15 ? 1 : 0) +
      (!eaten.has("Dinner") && hour < 22 ? 1 : 0) +
      (hour < 20 ? 1 : 0)
  );

  const lastMealAt = foods.length ? Math.max(...foods.map((f) => f.createdAt)) : now.getTime();
  const targetTimeMs = Math.max(now.getTime() + 15 * 60000, lastMealAt + 3 * 3600000);
  const t = new Date(targetTimeMs);

  const mealCals = Math.max(250, Math.round(left.calories / slotsLeft));
  const proteinShare = slotsLeft <= 1 ? 1 : 0.55;
  const need = {
    protein: clamp(Math.round(left.protein * proteinShare), 0, 70),
    fat: clamp(Math.round((left.fat / slotsLeft) * 0.9), 0, 40),
    carbs: 0,
  };
  need.carbs = clamp(Math.round((mealCals - need.protein * 4 - need.fat * 9) / 4), 0, 130);

  // Build several distinct, rerollable options.
  const options: MealOption[] = [];
  if (meal === "Breakfast") {
    options.push(buildBreakfast(need, 0), buildBreakfast(need, 1));
    options.push(buildPlate(PROTEINS[0], CARBS[1], need)); // chicken + sweet potato
  } else {
    const pairings: Array<[number, number]> = [
      [0, 0], // chicken + brown rice
      [3, 1], // salmon + sweet potato (fattier — good Accutane meal)
      [1, 2], // turkey + quinoa
      [2, 3], // white fish + new potatoes
      [4, 0], // tuna + brown rice
      [6, 1], // tofu + sweet potato
    ];
    for (const [pi, ci] of pairings) options.push(buildPlate(PROTEINS[pi], CARBS[ci], need));
  }

  const note = buildNote(left, targets);

  // Accutane helper: identify the fattiest meal to pair the dose with.
  let accutane: AccutaneAdvice | undefined;
  if (accutaneMode) accutane = accutaneAdvice(foods, options);

  return {
    meal,
    time: fmtTime(t.getHours(), t.getMinutes() < 30 ? 0 : 30),
    remaining: roundMacros(left),
    note,
    options,
    accutane,
  };
}

function accutaneAdvice(foods: FoodEntry[], options: MealOption[]): AccutaneAdvice {
  // Fat per logged meal today.
  const byMeal: Record<string, number> = {};
  for (const f of foods) byMeal[f.meal] = (byMeal[f.meal] ?? 0) + f.fat;
  let bestMeal = "";
  let bestFat = 0;
  for (const [m, fat] of Object.entries(byMeal)) {
    if (fat > bestFat) {
      bestFat = fat;
      bestMeal = m;
    }
  }

  // The fattiest upcoming option (salmon plate etc.).
  const plannedFat = options.reduce((mx, o) => Math.max(mx, o.macros.fat), 0);

  if (bestFat >= 15 && bestFat >= plannedFat) {
    return {
      mealName: bestMeal,
      fatGrams: Math.round(bestFat),
      planned: false,
      text: `Take your Accutane dose with ${bestMeal.toLowerCase()} — it's your fattiest meal today (~${Math.round(
        bestFat
      )} g fat). Isotretinoin absorbs far better with dietary fat.`,
    };
  }
  return {
    mealName: "your next meal",
    fatGrams: Math.round(plannedFat),
    planned: true,
    text: `Save your Accutane dose for your fattiest meal. A salmon or avocado option below (~${Math.round(
      plannedFat
    )} g fat) is ideal — isotretinoin absorbs far better with dietary fat.`,
  };
}

function buildNote(left: Macros, targets: Targets): string {
  if (left.calories <= 50 && left.protein <= 10)
    return "On target for today — nicely done. Any extra should be protein or veg.";
  if (left.calories < 0)
    return "You're over your calorie target. If you eat again, keep it light and high-protein.";
  if (left.protein > targets.protein * 0.6)
    return "Protein is the priority — lead with a lean protein source.";
  if (left.protein <= 15 && left.calories > 300)
    return "Protein is nearly hit — you have room for low-GI carbs to fuel training.";
  return "Lean & skin-friendly: protein first, moderate clean fats, low-GI carbs fill the rest.";
}
