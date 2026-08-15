import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppState,
  DayLog,
  FoodEntry,
  Macros,
  MealType,
  Profile,
  Settings,
  Targets,
} from "../types";
import { loadState, saveState } from "../lib/storage";
import { toDateKey } from "../lib/date";
import { parseMeal } from "../lib/parser";
import { autoJunk } from "../data/foodTags";
import { computeTargets } from "../lib/goals";

let idCounter = 0;
const genId = () =>
  `${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

export function guessMeal(now: Date = new Date()): MealType {
  const h = now.getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h >= 17 && h < 22) return "Dinner";
  return "Snacks";
}

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const ensureDay = useCallback((s: AppState, date: string): DayLog => {
    return s.days[date] ?? { date, foods: [] };
  }, []);

  const addFoodsFromText = useCallback(
    (date: string, text: string, meal: MealType): number => {
      const parsed = parseMeal(text);
      if (!parsed.length) return 0;
      const now = Date.now();
      const entries: FoodEntry[] = parsed.map((p, i) => ({
        id: genId(),
        name: p.name,
        quantity: p.quantity,
        meal,
        estimated: true,
        createdAt: now + i,
        calories: p.calories,
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
        junk: autoJunk(p.name),
        source: "text",
      }));
      setState((s) => {
        const day = ensureDay(s, date);
        return {
          ...s,
          days: {
            ...s.days,
            [date]: { ...day, foods: [...day.foods, ...entries] },
          },
        };
      });
      return entries.length;
    },
    [ensureDay]
  );

  const updateFood = useCallback(
    (date: string, id: string, patch: Partial<FoodEntry>) => {
      setState((s) => {
        const day = s.days[date];
        if (!day) return s;
        return {
          ...s,
          days: {
            ...s.days,
            [date]: {
              ...day,
              foods: day.foods.map((f) =>
                f.id === id ? { ...f, ...patch, estimated: false } : f
              ),
            },
          },
        };
      });
    },
    []
  );

  const deleteFood = useCallback((date: string, id: string) => {
    setState((s) => {
      const day = s.days[date];
      if (!day) return s;
      return {
        ...s,
        days: {
          ...s.days,
          [date]: { ...day, foods: day.foods.filter((f) => f.id !== id) },
        },
      };
    });
  }, []);

  /** Add a food from a scanned barcode product with computed macros. */
  const addBarcodeFood = useCallback(
    (
      date: string,
      food: { name: string; quantity: string; macros: Macros },
      meal: MealType
    ) => {
      setState((s) => {
        const day = ensureDay(s, date);
        const entry: FoodEntry = {
          id: genId(),
          name: food.name,
          quantity: food.quantity,
          meal,
          estimated: true,
          createdAt: Date.now(),
          calories: Math.round(food.macros.calories),
          protein: Math.round(food.macros.protein * 10) / 10,
          carbs: Math.round(food.macros.carbs * 10) / 10,
          fat: Math.round(food.macros.fat * 10) / 10,
          junk: autoJunk(food.name),
          source: "barcode",
        };
        return {
          ...s,
          days: { ...s.days, [date]: { ...day, foods: [...day.foods, entry] } },
        };
      });
    },
    [ensureDay]
  );

  const toggleJunk = useCallback((date: string, id: string) => {
    setState((s) => {
      const day = s.days[date];
      if (!day) return s;
      return {
        ...s,
        days: {
          ...s.days,
          [date]: {
            ...day,
            foods: day.foods.map((f) =>
              f.id === id ? { ...f, junk: !f.junk } : f
            ),
          },
        },
      };
    });
  }, []);

  const setBodyweight = useCallback((date: string, weight: number | undefined) => {
    setState((s) => {
      const day = s.days[date] ?? { date, foods: [] };
      return { ...s, days: { ...s.days, [date]: { ...day, bodyweight: weight } } };
    });
  }, []);

  const setTargets = useCallback((targets: Targets) => {
    // Manually editing targets turns off auto-calculation.
    setState((s) => ({
      ...s,
      settings: { ...s.settings, targets, autoTargets: false },
    }));
  }, []);

  /** Save a profile and (re)calculate targets from it automatically. */
  const applyProfile = useCallback((profile: Profile) => {
    setState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        profile,
        autoTargets: true,
        targets: computeTargets(profile),
      },
    }));
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const today = toDateKey();

  return useMemo(
    () => ({
      state,
      today,
      addFoodsFromText,
      addBarcodeFood,
      toggleJunk,
      updateFood,
      deleteFood,
      setBodyweight,
      setTargets,
      applyProfile,
      setSettings,
    }),
    [
      state,
      today,
      addFoodsFromText,
      addBarcodeFood,
      toggleJunk,
      updateFood,
      deleteFood,
      setBodyweight,
      setTargets,
      applyProfile,
      setSettings,
    ]
  );
}
