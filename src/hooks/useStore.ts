import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppState,
  DayLog,
  ExerciseEntry,
  FoodEntry,
  Macros,
  MealType,
  Profile,
  Settings,
  Targets,
} from "../types";
import { loadState, saveState } from "../lib/storage";
import { addDays, toDateKey } from "../lib/date";
import { parseMeal } from "../lib/parser";
import { autoJunk } from "../data/foodTags";
import { computeTargets } from "../lib/goals";
import { parseExerciseText } from "../lib/exercise";
import { searchFoods } from "../lib/foodSearch";
import { scaleTo } from "../lib/openfoodfacts";

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

  /** Patch a food's macros/quantity in place without flipping the estimate flag. */
  const patchFoodMacros = useCallback(
    (date: string, id: string, macros: Macros, quantity?: string) => {
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
                f.id === id
                  ? {
                      ...f,
                      calories: Math.round(macros.calories),
                      protein: Math.round(macros.protein * 10) / 10,
                      carbs: Math.round(macros.carbs * 10) / 10,
                      fat: Math.round(macros.fat * 10) / 10,
                      quantity: quantity ?? f.quantity,
                    }
                  : f
              ),
            },
          },
        };
      });
    },
    []
  );

  /** Look an unrecognised food up online and fill in its macros. */
  const resolveOnline = useCallback(
    async (date: string, id: string, name: string, grams?: number, count?: number) => {
      try {
        const hits = await searchFoods(name);
        const hit = hits[0];
        if (!hit) return;
        const g = grams ?? (count ? count * (hit.servingG || 100) : hit.servingG || 100);
        const macros = scaleTo(g, hit.per100g);
        const qty = grams ? undefined : `${Math.round(g)} g`;
        patchFoodMacros(date, id, macros, qty);
      } catch {
        // offline or lookup failed — leave the entry for the user to edit
      }
    },
    [patchFoodMacros]
  );

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
      // For anything not in the built-in database, estimate it from the online
      // food database in the background and fill the macros in when it returns.
      parsed.forEach((p, i) => {
        if (!p.matched && p.name.trim().length >= 3) {
          resolveOnline(date, entries[i].id, p.name, p.grams, p.count);
        }
      });
      return entries.length;
    },
    [ensureDay, resolveOnline]
  );

  /** Add pre-estimated foods (e.g. from the Claude AI parser) to a day. */
  const addEstimatedFoods = useCallback(
    (
      date: string,
      foods: { name: string; quantity: string; macros: Macros }[],
      meal: MealType
    ): number => {
      if (!foods.length) return 0;
      const now = Date.now();
      const entries: FoodEntry[] = foods.map((f, i) => ({
        id: genId(),
        name: f.name,
        quantity: f.quantity,
        meal,
        estimated: true,
        createdAt: now + i,
        calories: Math.round(f.macros.calories),
        protein: Math.round(f.macros.protein * 10) / 10,
        carbs: Math.round(f.macros.carbs * 10) / 10,
        fat: Math.round(f.macros.fat * 10) / 10,
        junk: autoJunk(f.name),
        source: "text",
      }));
      setState((s) => {
        const day = ensureDay(s, date);
        return {
          ...s,
          days: { ...s.days, [date]: { ...day, foods: [...day.foods, ...entries] } },
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

  /** Add a food estimated from a photo, keeping the photo thumbnail. */
  const addPhotoFood = useCallback(
    (
      date: string,
      food: { name: string; quantity: string; macros: Macros; photo?: string },
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
          photo: food.photo,
          source: "photo",
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

  /** Parse a free-text workout description and log the estimated burn. */
  const addExerciseFromText = useCallback(
    (date: string, text: string, weightKg: number): number => {
      const parsed = parseExerciseText(text, weightKg);
      if (!parsed.length) return 0;
      const now = Date.now();
      const entries: ExerciseEntry[] = parsed.map((p, i) => ({
        id: genId(),
        description: p.description,
        type: p.type,
        minutes: p.minutes,
        calories: p.calories,
        strength: p.strength,
        createdAt: now + i,
      }));
      setState((s) => {
        const day = ensureDay(s, date);
        return {
          ...s,
          days: {
            ...s.days,
            [date]: { ...day, exercises: [...(day.exercises ?? []), ...entries] },
          },
        };
      });
      return entries.length;
    },
    [ensureDay]
  );

  const updateExercise = useCallback(
    (date: string, id: string, patch: Partial<ExerciseEntry>) => {
      setState((s) => {
        const day = s.days[date];
        if (!day) return s;
        return {
          ...s,
          days: {
            ...s.days,
            [date]: {
              ...day,
              exercises: (day.exercises ?? []).map((e) =>
                e.id === id ? { ...e, ...patch } : e
              ),
            },
          },
        };
      });
    },
    []
  );

  const deleteExercise = useCallback((date: string, id: string) => {
    setState((s) => {
      const day = s.days[date];
      if (!day) return s;
      return {
        ...s,
        days: {
          ...s.days,
          [date]: {
            ...day,
            exercises: (day.exercises ?? []).filter((e) => e.id !== id),
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

  /** Copy the previous day's foods into `date`. Returns how many were copied. */
  const copyPreviousDay = useCallback(
    (date: string): number => {
      const prev = addDays(date, -1);
      let count = 0;
      setState((s) => {
        const from = s.days[prev];
        if (!from || from.foods.length === 0) return s;
        const now = Date.now();
        const copies: FoodEntry[] = from.foods.map((f, i) => ({
          ...f,
          id: genId(),
          createdAt: now + i,
        }));
        count = copies.length;
        const day = ensureDay(s, date);
        return {
          ...s,
          days: { ...s.days, [date]: { ...day, foods: [...day.foods, ...copies] } },
        };
      });
      return count;
    },
    [ensureDay]
  );

  /** Replace the entire app state (used when importing a backup). */
  const importState = useCallback((next: AppState) => {
    setState(next);
  }, []);

  const today = toDateKey();

  return useMemo(
    () => ({
      state,
      today,
      addFoodsFromText,
      addEstimatedFoods,
      addBarcodeFood,
      addPhotoFood,
      toggleJunk,
      updateFood,
      deleteFood,
      addExerciseFromText,
      updateExercise,
      deleteExercise,
      setBodyweight,
      setTargets,
      applyProfile,
      setSettings,
      copyPreviousDay,
      importState,
    }),
    [
      state,
      today,
      addFoodsFromText,
      addEstimatedFoods,
      addBarcodeFood,
      addPhotoFood,
      toggleJunk,
      updateFood,
      deleteFood,
      addExerciseFromText,
      updateExercise,
      deleteExercise,
      setBodyweight,
      setTargets,
      applyProfile,
      setSettings,
      copyPreviousDay,
      importState,
    ]
  );
}
