import type { Macros } from "../types";

export interface SearchHit {
  name: string;
  brand?: string;
  per100g: Macros;
  servingG?: number;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Search foods by name on OpenFoodFacts (free, CORS-enabled).
 * Returns per-100g macros so the caller can scale to any serving.
 */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: q,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "20",
      fields: "product_name,brands,nutriments,serving_quantity",
    }).toString();

  const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  const products: any[] = Array.isArray(data.products) ? data.products : [];

  const hits: SearchHit[] = [];
  for (const p of products) {
    const name = (p.product_name || "").trim();
    if (!name) continue;
    const n = p.nutriments ?? {};
    let kcal = num(n["energy-kcal_100g"]);
    if (!kcal && n["energy_100g"]) kcal = Math.round(num(n["energy_100g"]) / 4.184);
    const per100g: Macros = {
      calories: Math.round(kcal),
      protein: Math.round(num(n["proteins_100g"]) * 10) / 10,
      carbs: Math.round(num(n["carbohydrates_100g"]) * 10) / 10,
      fat: Math.round(num(n["fat_100g"]) * 10) / 10,
    };
    // skip products with no usable macro data
    if (!per100g.calories && !per100g.protein && !per100g.carbs && !per100g.fat) continue;
    hits.push({
      name,
      brand: (p.brands || "").split(",")[0]?.trim() || undefined,
      per100g,
      servingG: num(p.serving_quantity) || undefined,
    });
    if (hits.length >= 12) break;
  }
  return hits;
}
