import { useEffect, useRef, useState } from "react";
import { MEAL_TYPES, type MealType, type Macros } from "../types";
import { searchFoods, type SearchHit } from "../lib/foodSearch";
import { scaleTo } from "../lib/openfoodfacts";

interface Props {
  defaultMeal: MealType;
  onAdd: (
    food: { name: string; quantity: string; macros: Macros },
    meal: MealType
  ) => void;
  onClose: () => void;
}

export function FoodSearchModal({ defaultMeal, onAdd, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [grams, setGrams] = useState("100");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search as you type.
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setStatus("idle");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    setStatus("loading");
    const t = setTimeout(async () => {
      try {
        const res = await searchFoods(query, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setHits(res);
          setStatus("idle");
        }
      } catch {
        if (!ctrl.signal.aborted) setStatus("error");
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const confirm = () => {
    if (!selected) return;
    const g = parseFloat(grams) || 100;
    onAdd(
      {
        name: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
        quantity: `${Math.round(g)} g`,
        macros: scaleTo(g, selected.per100g),
      },
      meal
    );
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-tall" onClick={(e) => e.stopPropagation()}>
        <h3>Search foods</h3>

        {!selected && (
          <>
            <div className="field">
              <input
                autoFocus
                value={query}
                placeholder="e.g. sausage roll, greek yogurt…"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {status === "loading" && <p className="hint">Searching…</p>}
            {status === "error" && (
              <p className="hint">Couldn't reach the food database. Check your connection.</p>
            )}
            {status === "idle" && query.trim().length >= 2 && hits.length === 0 && (
              <p className="hint">No matches. Try a simpler term or scan the barcode.</p>
            )}
            <div className="search-results">
              {hits.map((h, i) => (
                <button
                  key={i}
                  className="search-hit"
                  onClick={() => {
                    setSelected(h);
                    setGrams(String(h.servingG && h.servingG > 0 ? h.servingG : 100));
                  }}
                >
                  <div className="sh-main">
                    <div className="sh-name">{h.name}</div>
                    {h.brand && <div className="sh-brand">{h.brand}</div>}
                  </div>
                  <div className="sh-cal">{h.per100g.calories}<small>/100g</small></div>
                </button>
              ))}
            </div>
          </>
        )}

        {selected && (
          <div>
            <div className="field">
              <label>Food</label>
              <input
                value={selected.name}
                onChange={(e) => setSelected({ ...selected, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Amount (grams)</label>
              <input inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} />
            </div>
            <div className="scan-macros">
              {(() => {
                const m = scaleTo(parseFloat(grams) || 0, selected.per100g);
                return (
                  <>
                    <span><b>{Math.round(m.calories)}</b> kcal</span>
                    <span><b>{Math.round(m.protein)}g</b> P</span>
                    <span><b>{Math.round(m.carbs)}g</b> C</span>
                    <span><b>{Math.round(m.fat)}g</b> F</span>
                  </>
                );
              })()}
            </div>
            <div className="field">
              <label>Meal</label>
              <div className="meal-tabs">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m}
                    className={`meal-tab${m === meal ? " active" : ""}`}
                    onClick={() => setMeal(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={confirm}>
                Add food
              </button>
            </div>
          </div>
        )}

        {!selected && (
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
