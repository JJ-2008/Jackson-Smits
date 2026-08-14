import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppState,
  DayLog,
  FoodEntry,
  MealType,
  Settings,
  Targets,
} from "../types";
import { loadState, saveState } from "../lib/storage";
import { toDateKey } from "../lib/date";
import { parseMeal } from "../lib/parser";

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

  const setBodyweight = useCallback((date: string, weight: number | undefined) => {
    setState((s) => {
      const day = s.days[date] ?? { date, foods: [] };
      return { ...s, days: { ...s.days, [date]: { ...day, bodyweight: weight } } };
    });
  }, []);

  const setTargets = useCallback((targets: Targets) => {
    setState((s) => ({ ...s, settings: { ...s.settings, targets } }));
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
      updateFood,
      deleteFood,
      setBodyweight,
      setTargets,
      setSettings,
    }),
    [
      state,
      today,
      addFoodsFromText,
      updateFood,
      deleteFood,
      setBodyweight,
      setTargets,
      setSettings,
    ]
  );
}
