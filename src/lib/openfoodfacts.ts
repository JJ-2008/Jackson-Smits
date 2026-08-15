import type { Macros } from "../types";

export interface ProductResult {
  name: string;
  brand?: string;
  /** macros per 100 g */
  per100g: Macros;
  /** a sensible serving size in grams if the product provides one */
  servingG?: number;
  found: true;
}

export interface ProductMiss {
  found: false;
  barcode: string;
}

export type BarcodeLookup = ProductResult | ProductMiss;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Look up a product by barcode on OpenFoodFacts (free, no key, CORS-enabled).
 * Returns per-100g macros so the caller can scale to any serving.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookup> {
  const code = barcode.replace(/\D/g, "");
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_quantity`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { found: false, barcode: code };

  const data = await res.json();
  if (data.status !== 1 || !data.product) return { found: false, barcode: code };

  const p = data.product;
  const n = p.nutriments ?? {};

  let kcal = num(n["energy-kcal_100g"]);
  if (!kcal && n["energy_100g"]) kcal = Math.round(num(n["energy_100g"]) / 4.184);

  const per100g: Macros = {
    calories: Math.round(kcal),
    protein: Math.round(num(n["proteins_100g"]) * 10) / 10,
    carbs: Math.round(num(n["carbohydrates_100g"]) * 10) / 10,
    fat: Math.round(num(n["fat_100g"]) * 10) / 10,
  };

  // Reject empty products (no usable macro data).
  if (per100g.calories === 0 && per100g.protein === 0 && per100g.carbs === 0 && per100g.fat === 0) {
    return { found: false, barcode: code };
  }

  const name: string = (p.product_name || "").trim() || "Scanned product";
  const brand: string | undefined = (p.brands || "").split(",")[0]?.trim() || undefined;
  const servingG = num(p.serving_quantity) || undefined;

  return { found: true, name, brand, per100g, servingG };
}

/** Scale per-100g macros to a gram amount. */
export function scaleTo(grams: number, per100g: Macros): Macros {
  const f = grams / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  };
}
