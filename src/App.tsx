import { useEffect, useMemo, useState } from "react";
import { useStore, guessMeal } from "./hooks/useStore";
import { dayTotals } from "./lib/nutrition";
import { addDays, formatLongDate, isToday } from "./lib/date";
import type { FoodEntry, WeightUnit } from "./types";

import { CalorieRing } from "./components/CalorieRing";
import { MacroCards, MacroRows } from "./components/MacroDisplay";
import { FoodInput } from "./components/FoodInput";
import { MealList } from "./components/MealList";
import { NextMeal } from "./components/NextMeal";
import { EditFoodModal } from "./components/EditFoodModal";
import { SettingsModal } from "./components/SettingsModal";
import { WeightView } from "./components/WeightView";
import { HistoryView } from "./components/HistoryView";

type Tab = "today" | "history" | "weight";

export default function App() {
  const store = useStore();
  const { state, today } = store;

  const [tab, setTab] = useState<Tab>("today");
  const [viewDate, setViewDate] = useState(today);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const day = state.days[viewDate];
  const foods = day?.foods ?? [];
  const totals = useMemo(() => dayTotals(day), [day]);
  const targets = state.settings.targets;

  const handleAdd = (text: string, meal: (typeof foods)[number]["meal"]) => {
    const n = store.addFoodsFromText(viewDate, text, meal);
    setToast(n > 0 ? `Added ${n} item${n > 1 ? "s" : ""}` : "Couldn't parse that — try again");
    return n;
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="date-nav">
          <button className="arrow" onClick={() => setViewDate((d) => addDays(d, -1))} aria-label="Previous day">
            ‹
          </button>
          <div className="date-label">
            <div className="eyebrow">{isToday(viewDate) ? "Today" : "Viewing"}</div>
            <div className="day">{formatLongDate(viewDate)}</div>
          </div>
          <button
            className="arrow"
            onClick={() => setViewDate((d) => addDays(d, 1))}
            aria-label="Next day"
            style={{ opacity: isToday(viewDate) ? 0.35 : 1 }}
            disabled={isToday(viewDate)}
          >
            ›
          </button>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
          ⚙
        </button>
      </header>

      {tab === "today" && (
        <>
          <div className="card dash">
            <CalorieRing consumed={totals.calories} target={targets.calories} />
            <MacroCards totals={totals} targets={targets} />
          </div>

          <FoodInput defaultMeal={guessMeal()} onAdd={handleAdd} />

          <NextMeal foods={foods} targets={targets} />

          <div className="card">
            <h2 className="section-title">Macro progress</h2>
            <MacroRows totals={totals} targets={targets} />
          </div>

          <MealList
            foods={foods}
            onEdit={(f) => setEditing(f)}
            onDelete={(id) => store.deleteFood(viewDate, id)}
          />
        </>
      )}

      {tab === "history" && <HistoryView state={state} today={today} />}

      {tab === "weight" && (
        <WeightView
          state={state}
          today={today}
          onSetWeight={store.setBodyweight}
          onSetUnit={(u: WeightUnit) => store.setSettings({ weightUnit: u })}
        />
      )}

      {editing && (
        <EditFoodModal
          food={editing}
          onSave={(patch) => store.updateFood(viewDate, editing.id, patch)}
          onDelete={() => store.deleteFood(viewDate, editing.id)}
          onClose={() => setEditing(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          targets={targets}
          onSave={store.setTargets}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <nav className="nav">
        <div className="nav-inner">
          <button className={`nav-btn${tab === "today" ? " active" : ""}`} onClick={() => setTab("today")}>
            <span className="ico">◎</span>
            Today
          </button>
          <button className={`nav-btn${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>
            <span className="ico">▤</span>
            History
          </button>
          <button className={`nav-btn${tab === "weight" ? " active" : ""}`} onClick={() => setTab("weight")}>
            <span className="ico">⚖</span>
            Weight
          </button>
        </div>
      </nav>
    </div>
  );
}
