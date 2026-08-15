/**
 * Lightweight keyword classifier used across logging, streaks and suggestions.
 * Works for database foods, scanned barcode products and free-text alike.
 *
 * These are general heuristics, not medical rules. Dermatology research links
 * high-glycaemic foods and (for some people) dairy to acne flare-ups, and
 * isotretinoin users are usually advised to keep things lean. We use that to
 * bias suggestions — the user can always override any single item.
 */

const JUNK = [
  "chocolate", "crisp", "chips", "fries", "biscuit", "cookie", "cake",
  "donut", "doughnut", "candy", "sweets", "ice cream", "pizza", "burger",
  "cola", "coke", "pepsi", "soda", "soft drink", "beer", "lager", "wine",
  "pastry", "croissant", "muffin", "sugar", "syrup", "milkshake", "fried",
  "nuggets", "hot dog", "hotdog", "kebab", "takeaway", "energy drink",
];

// High-glycaemic / dairy / greasy — the things most associated with breakouts.
const ACNE = [
  "chocolate", "crisp", "chips", "fries", "biscuit", "cookie", "cake",
  "donut", "doughnut", "candy", "sweets", "ice cream", "pizza", "burger",
  "cola", "coke", "pepsi", "soda", "soft drink", "sugar", "syrup",
  "milkshake", "fried", "white bread", "bagel", "cereal", "pastry",
  "croissant", "muffin", "whole milk", "cheese", "jam", "honey",
  "cornflakes", "corn flakes",
];

// Clean, lean, muscle-sparing staples that are also gentle on skin.
const LEAN_SAFE = [
  "chicken breast", "turkey", "white fish", "cod", "haddock", "tilapia",
  "salmon", "tuna", "prawns", "shrimp", "egg", "egg white", "tofu",
  "lentils", "chickpeas", "beans", "greek yogurt", "cottage cheese",
  "oats", "brown rice", "quinoa", "couscous", "sweet potato", "potato",
  "broccoli", "spinach", "vegetables", "veg", "salad", "avocado",
  "almonds", "olive oil", "berries", "blueberries", "strawberries",
  "banana", "apple", "orange",
];

const has = (name: string, list: string[]) => {
  const n = name.toLowerCase();
  return list.some((k) => n.includes(k));
};

export const isJunk = (name: string) => has(name, JUNK);
export const isAcneRisk = (name: string) => has(name, ACNE);
export const isLeanSafe = (name: string) => has(name, LEAN_SAFE) && !isAcneRisk(name);

/** Auto-flag a freshly parsed/scanned food as junk. */
export function autoJunk(name: string): boolean {
  return isJunk(name);
}
