import { describe, it, expect } from "vitest";
import { computeTargets, parseGoalText } from "../lib/goals";
import { scaleTo } from "../lib/openfoodfacts";
import { streakSummary } from "../lib/streak";
import { isJunk, isAcneRisk } from "../data/foodTags";
import type { AppState, DayLog, FoodEntry } from "../types";
import { DEFAULT_SETTINGS } from "../lib/storage";

const mkFood = (p: Partial<FoodEntry>): FoodEntry => ({
  id: Math.random().toString(),
  name: "x",
  quantity: "1",
  meal: "Lunch",
  estimated: true,
  createdAt: 0,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  ...p,
});

describe("automatic goal / target calculation", () => {
  it("computes a sensible, non-extreme cut for an 82kg male", () => {
    const t = computeTargets({
      sex: "male",
      age: 22,
      heightCm: 180,
      weightKg: 82,
      activity: "moderate",
      goal: "cut",
    });
    // High protein for muscle retention (~2.2 g/kg)
    expect(t.protein).toBeGreaterThanOrEqual(170);
    // Not a crash diet
    expect(t.calories).toBeGreaterThan(1800);
    // Fat not too low
    expect(t.fat).toBeGreaterThanOrEqual(40);
    // Macros roughly reconcile with calories (within 10%)
    const macroCals = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(macroCals - t.calories) / t.calories).toBeLessThan(0.1);
  });

  it("maintenance calories exceed cut calories", () => {
    const base = { sex: "male", age: 22, heightCm: 180, weightKg: 82, activity: "moderate" } as const;
    const cut = computeTargets({ ...base, goal: "cut" });
    const maintain = computeTargets({ ...base, goal: "maintain" });
    expect(maintain.calories).toBeGreaterThan(cut.calories);
  });

  it("parses a free-text goal", () => {
    const hints = parseGoalText("I want to lose fat but keep muscle, I'm 82kg");
    expect(hints.goal).toBe("cut");
    expect(hints.weightKg).toBe(82);
  });
});

describe("barcode macro scaling", () => {
  it("scales per-100g macros to a serving", () => {
    const per100 = { calories: 400, protein: 20, carbs: 50, fat: 10 };
    const m = scaleTo(50, per100);
    expect(m.calories).toBe(200);
    expect(m.protein).toBe(10);
  });
});

describe("junk / acne classification", () => {
  it("flags obvious junk and skin-risk foods", () => {
    expect(isJunk("Milk chocolate bar")).toBe(true);
    expect(isJunk("Chicken breast")).toBe(false);
    expect(isAcneRisk("white bread")).toBe(true);
    expect(isAcneRisk("Salmon fillet")).toBe(false);
    // regression: healthy staples must NOT be flagged as junk/acne
    expect(isJunk("Sweet potato")).toBe(false);
    expect(isAcneRisk("Sweet potato")).toBe(false);
    expect(isJunk("Greek yogurt")).toBe(false);
  });
});

describe("clean-eating & goals streak", () => {
  it("counts clean/goal/perfect days and trailing streaks", () => {
    const days: Record<string, DayLog> = {
      "2026-08-14": {
        date: "2026-08-14",
        foods: [mkFood({ name: "Chicken breast", calories: 2400, protein: 200, carbs: 235, fat: 70 })],
      },
      "2026-08-13": {
        date: "2026-08-13",
        foods: [
          mkFood({ name: "Chicken breast", calories: 2000, protein: 200, carbs: 180, fat: 60 }),
          mkFood({ name: "Chocolate bar", junk: true, calories: 300, protein: 3, carbs: 40, fat: 15 }),
        ],
      },
    };
    const state: AppState = { days, settings: { ...DEFAULT_SETTINGS } };
    const sum = streakSummary(state, 7, "2026-08-14");
    // today: on-target and clean -> perfect
    expect(sum.perfectStreak).toBe(1);
    // yesterday had junk, so clean streak is just today
    expect(sum.cleanStreak).toBe(1);
    expect(sum.loggedDays).toBe(2);
    expect(sum.cleanDays).toBe(1);
  });
});
