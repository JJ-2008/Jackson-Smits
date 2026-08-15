import type { Activity, GoalType, Profile, Targets } from "../types";

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentary (desk job, little exercise)",
  light: "Light (1–3 workouts/week)",
  moderate: "Moderate (3–5 workouts/week)",
  active: "Active (6–7 workouts/week)",
  very_active: "Very active (physical job + training)",
};

export const GOAL_LABEL: Record<GoalType, string> = {
  cut: "Lose fat, keep muscle (cut)",
  recomp: "Recomp (slow fat loss + muscle)",
  maintain: "Maintain",
  lean_bulk: "Lean bulk (gain muscle slowly)",
};

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

export function tdee(p: Profile): number {
  return bmr(p) * ACTIVITY_FACTOR[p.activity];
}

/**
 * Compute daily targets from a profile.
 * Cutting priorities baked in: high protein for muscle retention, enough
 * dietary fat, carbs fill the rest — and never an extreme deficit.
 */
export function computeTargets(p: Profile): Targets {
  const maintenance = tdee(p);

  let calories: number;
  switch (p.goal) {
    case "cut":
      // ~20% deficit, but capped so it's never crash-dieting.
      calories = Math.max(maintenance - 600, maintenance * 0.8, bmr(p) * 1.15);
      break;
    case "recomp":
      calories = maintenance * 0.95;
      break;
    case "lean_bulk":
      calories = maintenance * 1.1;
      break;
    case "maintain":
    default:
      calories = maintenance;
  }
  calories = Math.round(calories / 10) * 10;

  // Protein: prioritise muscle retention (~2 g/kg, a touch higher on a cut).
  const proteinPerKg = p.goal === "cut" ? 2.2 : 2.0;
  let protein = Math.round(p.weightKg * proteinPerKg);

  // Fat: enough for hormones/skin (~0.8 g/kg), min 0.6 g/kg.
  let fat = Math.round(p.weightKg * 0.8);

  // Carbs fill whatever calories remain.
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  // Guard rails: if protein+fat overshoot, trim fat then protein before carbs go negative.
  if (carbs < 60) {
    fat = Math.max(Math.round(p.weightKg * 0.6), fat - (60 - carbs) * 0); // keep fat sane
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
    if (carbs < 40) {
      protein = Math.round((calories - fat * 9 - 40 * 4) / 4);
      carbs = 40;
    }
  }

  return {
    calories,
    protein: Math.max(0, protein),
    carbs: Math.max(0, carbs),
    fat: Math.max(0, fat),
  };
}

/**
 * Parse a free-text goal description into profile hints.
 * e.g. "lose fat but keep muscle, I'm 82kg" -> { goal: "cut", weightKg: 82 }
 */
export function parseGoalText(text: string): Partial<Profile> {
  const t = text.toLowerCase();
  const out: Partial<Profile> = { goalText: text };

  // goal type
  if (/\b(recomp|tone|body\s?recomp|lose fat and (gain|build))\b/.test(t)) {
    out.goal = "recomp";
  } else if (/\b(cut|shred|lean out|lose (fat|weight)|drop (fat|weight)|get lean)\b/.test(t)) {
    out.goal = "cut";
  } else if (/\b(bulk|gain (muscle|weight|mass)|build muscle|grow|size)\b/.test(t)) {
    out.goal = "lean_bulk";
  } else if (/\b(maintain|stay the same|hold|keep my weight)\b/.test(t)) {
    out.goal = "maintain";
  }

  // bodyweight
  const kg = t.match(/(\d{2,3}(?:\.\d)?)\s?kg/);
  const lb = t.match(/(\d{2,3})\s?(?:lb|lbs|pounds)/);
  if (kg) out.weightKg = parseFloat(kg[1]);
  else if (lb) out.weightKg = Math.round(parseFloat(lb[1]) * 0.4536 * 10) / 10;

  // height
  const cm = t.match(/(\d{3})\s?cm/);
  if (cm) out.heightCm = parseFloat(cm[1]);
  const ft = t.match(/(\d)\s?(?:'|ft|foot|feet)\s?(\d{1,2})?/);
  if (ft) {
    const inches = parseInt(ft[1]) * 12 + (ft[2] ? parseInt(ft[2]) : 0);
    out.heightCm = Math.round(inches * 2.54);
  }

  // age
  const age = t.match(/\b(\d{2})\s?(?:yo|years old|y\/o|year old)\b/);
  if (age) out.age = parseInt(age[1]);

  // sex
  if (/\b(female|woman|girl)\b/.test(t)) out.sex = "female";
  else if (/\b(male|man|guy|boy)\b/.test(t)) out.sex = "male";

  return out;
}

export const DEFAULT_PROFILE: Profile = {
  sex: "male",
  age: 18,
  heightCm: 178,
  weightKg: 80,
  activity: "moderate",
  goal: "cut",
};
