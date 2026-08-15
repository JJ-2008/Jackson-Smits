import { describe, it, expect } from "vitest";
import { parseMeal, parsePhrase } from "../lib/parser";
import { sumMacros } from "../lib/nutrition";
import { suggestNextMeal } from "../lib/suggest";
import type { FoodEntry } from "../types";

describe("natural language food parser", () => {
  it("parses '3 eggs in an omelette and 3 cups of lemon water'", () => {
    const foods = parseMeal("3 eggs in an omelette and 3 cups of lemon water");
    // Should find eggs and water (2 items)
    const names = foods.map((f) => f.name);
    expect(names).toContain("Egg");
    expect(names).toContain("Water");

    const egg = foods.find((f) => f.name === "Egg")!;
    expect(egg.quantity).toBe("3");
    // 3 eggs ~ 216 kcal, ~19g protein
    expect(egg.calories).toBeGreaterThan(180);
    expect(egg.calories).toBeLessThan(260);
    expect(egg.protein).toBeGreaterThan(15);

    const water = foods.find((f) => f.name === "Water")!;
    expect(water.calories).toBe(0);
  });

  it("parses gram quantities: '200g chicken breast and 250g cooked rice'", () => {
    const foods = parseMeal("200g chicken breast and 250g cooked rice");
    expect(foods).toHaveLength(2);

    const chicken = foods.find((f) => f.name === "Chicken breast")!;
    expect(chicken.quantity).toBe("200 g");
    // 200g chicken breast ~ 330 kcal, 62g protein
    expect(chicken.calories).toBeGreaterThan(300);
    expect(chicken.calories).toBeLessThan(360);
    expect(chicken.protein).toBeCloseTo(62, 0);

    const rice = foods.find((f) => f.name === "Cooked rice")!;
    expect(rice.quantity).toBe("250 g");
    // 250g cooked rice ~ 325 kcal, 70g carbs
    expect(rice.carbs).toBeGreaterThan(60);
  });

  it("parses 'Protein shake with milk and banana'", () => {
    const foods = parseMeal("Protein shake with milk and banana");
    const names = foods.map((f) => f.name);
    expect(names).toContain("Protein shake");
    expect(names).toContain("Milk");
    expect(names).toContain("Banana");
    const total = sumMacros(foods);
    // reasonable shake total
    expect(total.protein).toBeGreaterThan(25);
    expect(total.calories).toBeGreaterThan(200);
  });

  it("parses 'I had a steak and chips'", () => {
    const foods = parseMeal("I had a steak and chips");
    const names = foods.map((f) => f.name);
    expect(names).toContain("Steak");
    expect(names).toContain("Chips");
    // stop words should not create phantom foods
    expect(names).not.toContain("I");
  });

  it("parses '2 eggs, toast and avocado'", () => {
    const foods = parseMeal("2 eggs, toast and avocado");
    const names = foods.map((f) => f.name);
    expect(names).toContain("Egg");
    expect(names).toContain("Bread");
    expect(names).toContain("Avocado");
    const egg = foods.find((f) => f.name === "Egg")!;
    expect(egg.quantity).toBe("2");
  });

  it("surfaces unknown foods so they can be corrected", () => {
    const p = parsePhrase("dragonfruit bowl");
    expect(p).not.toBeNull();
    expect(p!.matched).toBe(false);
    expect(p!.calories).toBe(0);
  });

  it("passes the parsed amount through for unmatched foods (online fallback)", () => {
    const p = parsePhrase("150g dragonfruit");
    expect(p!.matched).toBe(false);
    expect(p!.grams).toBe(150);
  });

  it("recognises more common foods from the expanded database", () => {
    for (const [phrase, name] of [
      ["150g halloumi", "Halloumi"],
      ["a sausage roll", "Sausage roll"],
      ["chicken caesar wrap", "Chicken wrap"],
      ["jacket potato", "Jacket potato"],
      ["katsu curry", "Katsu curry"],
    ] as const) {
      const p = parsePhrase(phrase);
      expect(p?.name, phrase).toBe(name);
      expect(p!.calories).toBeGreaterThan(0);
    }
  });

  it("macro-derived calories stay sane for a full day log", () => {
    const foods = parseMeal(
      "200g chicken breast, 250g cooked rice, 2 eggs, banana and 30g almonds"
    );
    const total = sumMacros(foods);
    const macroKcal = total.protein * 4 + total.carbs * 4 + total.fat * 9;
    // stored calories should be within ~15% of macro-derived calories
    expect(Math.abs(total.calories - macroKcal) / macroKcal).toBeLessThan(0.15);
  });
});

describe("next-meal suggestion (cutting logic)", () => {
  const targets = { calories: 2400, protein: 200, carbs: 235, fat: 70 };

  it("prioritises protein and gives a realistic plate", () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    const foods: FoodEntry[] = [
      {
        id: "1",
        name: "Oats",
        quantity: "60 g",
        meal: "Breakfast",
        estimated: true,
        createdAt: now.getTime(),
        calories: 233,
        protein: 8,
        carbs: 40,
        fat: 4,
      },
    ];
    const s = suggestNextMeal(foods, targets, now);
    expect(s.remaining.calories).toBe(2400 - 233);
    expect(s.remaining.protein).toBe(200 - 8);
    expect(s.options.length).toBeGreaterThan(1); // rerollable options
    expect(s.options[0].items.length).toBeGreaterThan(0);
    expect(s.options[0].macros.protein).toBeGreaterThan(0);
    // recommended time should be a parseable time string
    expect(s.time).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
  });

  it("offers a fattier option and Accutane guidance when enabled", () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const s = suggestNextMeal([], { calories: 2400, protein: 200, carbs: 235, fat: 70 }, now, true);
    // multiple distinct options to reroll through
    const labels = new Set(s.options.map((o) => o.label));
    expect(labels.size).toBeGreaterThan(1);
    // at least one option should be notably fattier (e.g. salmon)
    expect(Math.max(...s.options.map((o) => o.macros.fat))).toBeGreaterThan(10);
    expect(s.accutane).toBeTruthy();
    expect(s.accutane!.text.toLowerCase()).toContain("fat");
  });
});
