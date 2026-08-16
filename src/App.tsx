import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useStore, guessMeal } from "./hooks/useStore";
import { parseMeal } from "./lib/parser";
import { dayTotals } from "./lib/nutrition";
import { totalBurn, hadStrength, exerciseAdjustedTargets } from "./lib/exercise";
import { addDays, formatLongDate, isToday } from "./lib/date";
import { exportBackup } from "./lib/backup";
import {
  loadAIConfig,
  saveAIConfig,
  loadCooldown,
  saveCooldown,
  type AIConfig,
} from "./lib/aiConfig";
import { parseFoodWithAI, AIError, AIRateLimitError } from "./lib/aiParser";
import type { FoodEntry } from "./types";

import { SplashScreen } from "./components/SplashScreen";
import { CalorieRing } from "./components/CalorieRing";
import { MacroCards, MacroRows } from "./components/MacroDisplay";
import { FoodInput } from "./components/FoodInput";
import { QuickActions } from "./components/QuickActions";
import { MealList } from "./components/MealList";
import { NextMeal } from "./components/NextMeal";
import { EditFoodModal } from "./components/EditFoodModal";
import { SettingsModal } from "./components/SettingsModal";
import { FoodSearchModal } from "./components/FoodSearchModal";
import { ExerciseView } from "./components/ExerciseView";
import { HistoryView } from "./components/HistoryView";
import { StreakTable } from "./components/StreakTable";

// Barcode scanning pulls in a sizeable decoder library — load it on demand.
const BarcodeScanner = lazy(() =>
  import("./components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);
// Photo recognition bundles a TensorFlow.js model — load it only when used.
const PhotoEstimator = lazy(() =>
  import("./components/PhotoEstimator").then((m) => ({ default: m.PhotoEstimator }))
);

type Tab = "today" | "history" | "exercise";

// Show the splash once per app launch (not on every re-render / tab switch).
let splashShown = false;

export default function App() {
  const store = useStore();
  const { state, today } = store;

  const [showSplash, setShowSplash] = useState(!splashShown);
  const [tab, setTab] = useState<Tab>("today");
  const [viewDate, setViewDate] = useState(today);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ai, setAi] = useState<AIConfig>(() => loadAIConfig());
  const [cooldown, setCooldown] = useState(() => loadCooldown());

  const saveAi = (cfg: AIConfig) => {
    setAi(cfg);
    saveAIConfig(cfg);
  };
  const applyCooldown = (retryAfterSec: number, daily: boolean) => {
    const cd = { until: Date.now() + retryAfterSec * 1000, daily };
    setCooldown(cd);
    saveCooldown(cd);
  };
  const aiActive = ai.enabled && ai.apiKey.trim().length > 0;

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

  const canCopyYesterday = (state.days[addDays(viewDate, -1)]?.foods.length ?? 0) > 0;

  const handleAdd = (text: string, meal: (typeof foods)[number]["meal"]) => {
    const n = store.addFoodsFromText(viewDate, text, meal);
    setToast(n > 0 ? `Added ${n} item${n > 1 ? "s" : ""}` : "Couldn't parse that — try again");
    return n;
  };

  // When Claude AI is on, route the description through it; fall back to the
  // built-in parser if the request fails so the user always gets an estimate.
  const handleAddAI = async (text: string, meal: (typeof foods)[number]["meal"]) => {
    try {
      const foundFoods = await parseFoodWithAI(text, ai.model, ai.apiKey);
      if (foundFoods.length) {
        const n = store.addEstimatedFoods(
          viewDate,
          foundFoods.map((f) => ({ name: f.name, quantity: f.quantity, macros: f })),
          meal
        );
        setToast(`Added ${n} item${n > 1 ? "s" : ""}`);
        return n;
      }
      const n = store.addFoodsFromText(viewDate, text, meal);
      setToast(n > 0 ? `Added ${n} item${n > 1 ? "s" : ""}` : "No food found in that");
      return n;
    } catch (e) {
      if (e instanceof AIRateLimitError) {
        applyCooldown(e.retryAfter, e.daily);
      }
      const msg = e instanceof AIError ? e.message : "AI couldn't handle that.";
      const n = store.addFoodsFromText(viewDate, text, meal);
      setToast(n > 0 ? `${msg} Used the built-in estimate instead.` : msg);
      return n;
    }
  };

  // True when the built-in database already recognises everything in the text,
  // so we can log it instantly for free without spending an AI request.
  const builtInHandlesAll = (text: string) => {
    const parsed = parseMeal(text);
    return parsed.length > 0 && parsed.every((p) => p.matched);
  };

  // Decide per-submit whether to spend an AI request. We skip AI while it's
  // cooling down, and (when "save my free limit" is on) for foods the built-in
  // database already knows — so the quota only goes on genuinely tricky ones.
  const handleSmartAdd = (text: string, meal: (typeof foods)[number]["meal"]) => {
    if (Date.now() < cooldown.until) return handleAdd(text, meal);
    if (ai.saveQuota && builtInHandlesAll(text)) return handleAdd(text, meal);
    return handleAddAI(text, meal);
  };

  const sameAsYesterday = () => {
    const n = store.copyPreviousDay(viewDate);
    setToast(n > 0 ? `Copied ${n} item${n > 1 ? "s" : ""} from yesterday` : "Nothing to copy");
  };

  if (showSplash) {
    return (
      <SplashScreen
        onDone={() => {
          splashShown = true;
          setShowSplash(false);
        }}
      />
    );
  }

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
            <h2 className="section-title">
              Calories
              <span>
                {totals.calories > targets.calories
                  ? `${(totals.calories - targets.calories).toLocaleString()} over`
                  : `${Math.round(targets.calories - totals.calories).toLocaleString()} left`}
              </span>
            </h2>
            <CalorieRing consumed={totals.calories} target={targets.calories} />
            {burn > 0 && (
              <div className="burn-badge" onClick={() => setTab("exercise")}>
                🔥 +{burn} kcal from exercise · target raised to{" "}
                {targets.calories.toLocaleString()}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">Macros</h2>
            <MacroCards totals={totals} targets={targets} />
          </div>

          <FoodInput
            defaultMeal={guessMeal()}
            onAdd={aiActive ? handleSmartAdd : handleAdd}
            onScan={() => setShowScanner(true)}
            onPhoto={() => setShowPhoto(true)}
            aiEnabled={aiActive}
            cooldownUntil={aiActive ? cooldown.until : 0}
            cooldownDaily={cooldown.daily}
          />

          <QuickActions
            canCopyYesterday={canCopyYesterday}
            onSameAsYesterday={sameAsYesterday}
            onOpenSearch={() => setShowSearch(true)}
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
          ai={ai}
          onSaveAi={saveAi}
          onApplyProfile={store.applyProfile}
          onSetTargets={store.setTargets}
          onSetSettings={store.setSettings}
          onExportBackup={() => {
            exportBackup(state);
            setToast("Backup downloaded");
          }}
          onImportState={store.importState}
          onToast={setToast}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSearch && (
        <FoodSearchModal
          defaultMeal={guessMeal()}
          onAdd={(food, meal) => {
            store.addBarcodeFood(viewDate, food, meal);
            setToast(`Added ${food.name}`);
          }}
          onClose={() => setShowSearch(false)}
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

      {showPhoto && (
        <Suspense fallback={<div className="toast">Loading photo estimator…</div>}>
          <PhotoEstimator
            defaultMeal={guessMeal()}
            onAdd={(food, meal) => {
              store.addPhotoFood(viewDate, food, meal);
              setToast(`Added ${food.name}`);
            }}
            onClose={() => setShowPhoto(false)}
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
