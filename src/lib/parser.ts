import { FOODS, type FoodDef } from "../data/foods";
import type { Macros } from "../types";

export interface ParsedFood extends Macros {
  name: string;
  quantity: string; // human readable, e.g. "200 g", "3", "1 cup"
  matched: boolean; // true if we found it in the database
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  half: 0.5, quarter: 0.25, couple: 2, dozen: 12,
};

// Volume-ish and count units mapped to grams/ml where useful.
const WEIGHT_UNITS: Record<string, number> = {
  g: 1, gram: 1, grams: 1, gm: 1, gs: 1,
  kg: 1000, kgs: 1000, kilo: 1000, kilos: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
};

const VOLUME_UNITS: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1, millilitre: 1, millilitres: 1,
  l: 1000, litre: 1000, litres: 1000, liter: 1000, liters: 1000,
  cup: 240, cups: 240, glass: 250, glasses: 250,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  pint: 568, pints: 568, shot: 44, shots: 44,
};

// Words that describe a count of items rather than weight.
const COUNT_UNITS = new Set([
  "slice", "slices", "piece", "pieces", "scoop", "scoops", "serving",
  "servings", "handful", "handfuls", "can", "cans", "bottle", "bottles",
  "bar", "bars", "rasher", "rashers", "clove", "cloves", "portion",
  "portions", "fillet", "fillets", "breast", "breasts",
]);

const STOP_WORDS = new Set([
  "of", "with", "and", "a", "an", "some", "the", "in", "on", "plus",
  "had", "ate", "eaten", "eat", "having", "have", "i", "my", "for",
  "then", "also", "today", "just", "large", "small", "medium", "big",
  "cooked", "raw", "grilled", "fried", "boiled", "baked", "fresh",
  "served", "topped", "side", "sides", "extra",
]);

const cleanWord = (w: string) => w.replace(/[^a-z0-9./-]/gi, "").toLowerCase();

/** Split a free-text meal description into individual food phrases. */
export function splitPhrases(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/\n/g, ",")
    .split(/,|;|\band\b|\bwith\b|\bplus\b|&|\bthen\b/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Find the best matching food definition for a phrase. */
function matchFood(phrase: string): FoodDef | undefined {
  const words = phrase.split(/\s+/).map(cleanWord).filter(Boolean);
  const text = " " + words.join(" ") + " ";

  // Prefer the food mentioned earliest in the phrase; break ties by the
  // most specific (longest) alias. This makes "3 eggs in an omelette" resolve
  // to eggs (the quantity is attached to eggs) and "sweet potato" beat "potato".
  let best: { def: FoodDef; index: number; len: number } | undefined;
  for (const def of FOODS) {
    for (const alias of def.aliases) {
      const needle = " " + alias + " ";
      const index = text.indexOf(needle);
      if (index === -1) continue;
      const len = alias.length;
      if (
        !best ||
        index < best.index ||
        (index === best.index && len > best.len)
      ) {
        best = { def, index, len };
      }
    }
  }
  return best?.def;
}

interface QtyResult {
  /** numeric multiplier count (e.g. 3 eggs -> 3) */
  count?: number;
  /** grams if a weight was specified */
  grams?: number;
  /** ml if a volume was specified */
  ml?: number;
  label: string;
}

/** Extract a quantity (weight, volume, or count) from a phrase. */
function parseQuantity(phrase: string): QtyResult {
  const raw = phrase.toLowerCase();

  // 1) attached weight/volume e.g. "200g", "250ml", "1.5kg"
  const attached = raw.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gs|grams?|oz|ounces?|lbs?|pounds?|ml|l|litres?|liters?)\b/);
  if (attached) {
    const n = parseFloat(attached[1]);
    const unit = attached[2];
    if (unit in WEIGHT_UNITS) {
      const grams = n * WEIGHT_UNITS[unit];
      return { grams, label: formatWeight(grams) };
    }
    if (unit in VOLUME_UNITS) {
      const ml = n * VOLUME_UNITS[unit];
      return { ml, label: formatVolume(ml) };
    }
  }

  const words = raw.split(/\s+/).map((w) => w.trim()).filter(Boolean);

  // 2) number + unit spread across tokens e.g. "3 cups", "2 slices", "1.5 cups"
  for (let i = 0; i < words.length; i++) {
    const numToken = words[i].replace(/[^0-9./]/g, "");
    const asWord = cleanWord(words[i]);
    let n: number | undefined;
    if (numToken && /\d/.test(numToken)) {
      n = numToken.includes("/") ? evalFraction(numToken) : parseFloat(numToken);
    } else if (asWord in NUMBER_WORDS) {
      n = NUMBER_WORDS[asWord];
    }
    if (n === undefined) continue;

    const next = cleanWord(words[i + 1] || "").replace(/s$/, "");
    const nextRaw = cleanWord(words[i + 1] || "");
    if (nextRaw in VOLUME_UNITS || next + "s" in VOLUME_UNITS || next in VOLUME_UNITS) {
      const key = nextRaw in VOLUME_UNITS ? nextRaw : next in VOLUME_UNITS ? next : next + "s";
      const ml = n * VOLUME_UNITS[key];
      return { ml, count: n, label: `${trimNum(n)} ${nextRaw}` };
    }
    if (nextRaw in WEIGHT_UNITS) {
      const grams = n * WEIGHT_UNITS[nextRaw];
      return { grams, label: formatWeight(grams) };
    }
    if (COUNT_UNITS.has(nextRaw)) {
      return { count: n, label: `${trimNum(n)} ${nextRaw}` };
    }
    // bare number -> item count
    return { count: n, label: trimNum(n) };
  }

  return { label: "" };
}

function evalFraction(s: string): number {
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : a;
}

const trimNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));

function formatWeight(grams: number): string {
  return grams >= 1000 ? `${trimNum(grams / 1000)} kg` : `${trimNum(grams)} g`;
}
function formatVolume(ml: number): string {
  return ml >= 1000 ? `${trimNum(ml / 1000)} L` : `${trimNum(ml)} ml`;
}

function scale(def: FoodDef, factor: number): Macros {
  return {
    calories: def.calories * factor,
    protein: def.protein * factor,
    carbs: def.carbs * factor,
    fat: def.fat * factor,
  };
}

/** Turn one phrase into a ParsedFood, applying quantity to the matched def. */
export function parsePhrase(phrase: string): ParsedFood | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;

  const def = matchFood(trimmed);
  const qty = parseQuantity(trimmed);

  if (!def) {
    // Unknown food — surface it so the user can correct it manually.
    const label = titleCase(
      trimmed
        .split(/\s+/)
        .map(cleanWord)
        .filter((w) => w && !STOP_WORDS.has(w) && !(w in NUMBER_WORDS) && !/^\d/.test(w))
        .join(" ")
    );
    if (!label) return null;
    return {
      name: label,
      quantity: qty.label || "1 serving",
      matched: false,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }

  let factor: number;
  let label: string;

  if (qty.grams !== undefined && def.basis === "100g") {
    factor = qty.grams / 100;
    label = formatWeight(qty.grams);
  } else if (qty.grams !== undefined && def.basis === "item" && def.gramsPerItem) {
    factor = qty.grams / def.gramsPerItem;
    label = formatWeight(qty.grams);
  } else if (qty.grams !== undefined) {
    // weight given for a 100ml food — treat grams ~ ml
    factor = qty.grams / 100;
    label = formatWeight(qty.grams);
  } else if (qty.ml !== undefined && def.basis === "100ml") {
    factor = qty.ml / 100;
    label = formatVolume(qty.ml);
  } else if (qty.ml !== undefined && def.basis === "item" && def.gramsPerItem) {
    factor = qty.ml / def.gramsPerItem;
    label = formatVolume(qty.ml);
  } else if (qty.ml !== undefined) {
    factor = qty.ml / 100;
    label = formatVolume(qty.ml);
  } else if (qty.count !== undefined) {
    if (def.basis === "item") {
      factor = qty.count;
      label = qty.label;
    } else {
      // count with a weight/volume food -> treat as N default servings
      const base = def.defaultQty ?? 100;
      factor = (qty.count * base) / 100;
      label = def.basis === "100ml" ? formatVolume(qty.count * base) : formatWeight(qty.count * base);
    }
  } else {
    // no quantity -> sensible default serving
    if (def.basis === "item") {
      factor = def.defaultQty ?? 1;
      label = trimNum(factor);
    } else {
      const base = def.defaultQty ?? 100;
      factor = base / 100;
      label = def.basis === "100ml" ? formatVolume(base) : formatWeight(base);
    }
  }

  const macros = scale(def, factor);
  return {
    name: def.name,
    quantity: label,
    matched: true,
    calories: round(macros.calories),
    protein: round1(macros.protein),
    carbs: round1(macros.carbs),
    fat: round1(macros.fat),
  };
}

/** Parse a whole natural-language meal string into individual foods. */
export function parseMeal(input: string): ParsedFood[] {
  const phrases = splitPhrases(input);
  const out: ParsedFood[] = [];
  for (const p of phrases) {
    const parsed = parsePhrase(p);
    if (parsed) out.push(parsed);
  }
  return out;
}

const round = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
