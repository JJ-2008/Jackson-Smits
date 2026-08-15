import type { Macros } from "../types";
import { PHOTO_FOODS, type PhotoFood } from "../data/photoFoods";

export interface Prediction {
  className: string;
  probability: number;
}

export interface MatchedFood {
  name: string;
  per100g: Macros;
  servingG: number;
  confidence: number; // 0..1
}

export interface PhotoMatch {
  best: MatchedFood | null;
  alternatives: MatchedFood[]; // other distinct food guesses
  topGuesses: string[]; // raw human-readable labels the model saw
}

function cleanLabel(className: string): string {
  // ImageNet labels are comma-separated synonyms — take the first, tidy it.
  return className.split(",")[0].replace(/_/g, " ").trim();
}

function findFood(className: string): PhotoFood | undefined {
  const c = className.toLowerCase();
  let best: { def: PhotoFood; len: number } | undefined;
  for (const def of PHOTO_FOODS) {
    for (const k of def.keywords) {
      if (c.includes(k) && (!best || k.length > best.len)) best = { def, len: k.length };
    }
  }
  return best?.def;
}

/**
 * Turn the classifier's ranked predictions into food guesses.
 * Returns the best mapped food plus distinct alternatives, and the raw
 * top labels so the user can see what the model thought.
 */
export function matchFromPredictions(predictions: Prediction[]): PhotoMatch {
  const seen = new Set<string>();
  const matches: MatchedFood[] = [];

  for (const p of predictions) {
    const def = findFood(p.className);
    if (!def || seen.has(def.name)) continue;
    seen.add(def.name);
    matches.push({
      name: def.name,
      per100g: def.per100g,
      servingG: def.servingG,
      confidence: p.probability,
    });
  }

  return {
    best: matches[0] ?? null,
    alternatives: matches.slice(1, 4),
    topGuesses: predictions.slice(0, 5).map((p) => cleanLabel(p.className)),
  };
}

/** Scale per-100g macros to a gram amount. */
export function scaleMacros(grams: number, per100g: Macros): Macros {
  const f = grams / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  };
}
