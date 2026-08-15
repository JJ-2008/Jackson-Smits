import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useStore, guessMeal } from "./hooks/useStore";
import { dayTotals } from "./lib/nutrition";
import { totalBurn, hadStrength, exerciseAdjustedTargets } from "./lib/exercise";
import { addDays, formatLongDate, isToday } from "./lib/date";
import type { FoodEntry } from "./types";

import { CalorieRing } from "./components/CalorieRing";
import { MacroCards, MacroRows } from "./components/MacroDisplay";
import { FoodInput } from "./components/FoodInput";
import { MealList } from "./components/MealList";
import { NextMeal } from "./components/NextMeal";
import { EditFoodModal } from "./components/EditFoodModal";
import { SettingsModal } from "./components/SettingsModal";
import { ExerciseView } from "./components/ExerciseView";
import { HistoryView } from "./components/HistoryView";
import { StreakTable } from "./components/StreakTable";

// Barcode scanning pulls in a sizeable decoder library — load it on demand.
const BarcodeScanner = lazy(() =>
  import("./components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

type Tab = "today" | "history" | "exercise";

export default function App() {
  const store = useStore();
  const { state, today } = store;

  const [tab, setTab] = useState<Tab>("today");
  const [viewDate, setViewDate] = useState(today);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const day = state.days[viewDate];
  const foods = day?.foods ?? [];
  const totals = useMemo(() => dayTotals(day), [day]);
  const baseTargets = state.settings.targets;

  // Exercise "adds back" calories: the dashboard, remaining totals and the
  // next-meal suggestion all run off exercise-adjusted targets for the day.
  const burn = totalBurn(day?.exercises);
  const targets = useMemo(
    () => exerciseAdjustedTargets(baseTargets, burn, hadStrength(day?.exercises)),
    [baseTargets, burn, day?.exercises]
  );

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
            {burn > 0 && (
              <div className="burn-badge" onClick={() => setTab("exercise")}>
                🔥 +{burn} kcal from exercise · target raised to{" "}
                {targets.calories.toLocaleString()}
              </div>
            )}
            <MacroCards totals={totals} targets={targets} />
          </div>

          <FoodInput
            defaultMeal={guessMeal()}
            onAdd={handleAdd}
            onScan={() => setShowScanner(true)}
          />

          <NextMeal
            foods={foods}
            targets={targets}
            accutaneMode={state.settings.accutaneMode}
          />

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

      {tab === "history" && (
        <>
          <StreakTable state={state} today={today} />
          <HistoryView state={state} today={today} />
        </>
      )}

      {tab === "exercise" && (
        <ExerciseView
          state={state}
          viewDate={viewDate}
          baseTargets={baseTargets}
          onAdd={(text, weightKg) => store.addExerciseFromText(viewDate, text, weightKg)}
          onDelete={(id) => store.deleteExercise(viewDate, id)}
          onToast={setToast}
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
          settings={state.settings}
          onApplyProfile={store.applyProfile}
          onSetTargets={store.setTargets}
          onSetSettings={store.setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showScanner && (
        <Suspense fallback={<div className="toast">Loading scanner…</div>}>
          <BarcodeScanner
            defaultMeal={guessMeal()}
            onAdd={(food, meal) => {
              store.addBarcodeFood(viewDate, food, meal);
              setToast(`Added ${food.name}`);
            }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
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
          <button className={`nav-btn${tab === "exercise" ? " active" : ""}`} onClick={() => setTab("exercise")}>
            <span className="ico">🏋️</span>
            Exercise
          </button>
        </div>
      </nav>
    </div>
  );
}
