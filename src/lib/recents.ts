import type { AppState, FavFood } from "../types";

/**
 * Most-recently-logged distinct foods across all days, newest first.
 * Used to power one-tap re-logging.
 */
export function recentFoods(state: AppState, limit = 8): FavFood[] {
  const all = Object.values(state.days)
    .flatMap((d) => d.foods)
    .sort((a, b) => b.createdAt - a.createdAt);

  const seen = new Set<string>();
  const out: FavFood[] = [];
  const favNames = new Set(state.settings.favourites.map((f) => f.name.toLowerCase()));

  for (const f of all) {
    const key = f.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (favNames.has(key)) continue; // don't duplicate favourites
    out.push({
      id: `recent-${key}`,
      name: f.name,
      quantity: f.quantity,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      junk: f.junk,
    });
    if (out.length >= limit) break;
  }
  return out;
}
