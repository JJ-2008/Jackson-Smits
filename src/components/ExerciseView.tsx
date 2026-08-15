import { useState } from "react";
import type { AppState, Targets } from "../types";
import {
  totalBurn,
  hadStrength,
  exerciseAdjustedTargets,
  exerciseBonus,
} from "../lib/exercise";
import { isToday } from "../lib/date";

interface Props {
  state: AppState;
  viewDate: string;
  baseTargets: Targets;
  onAdd: (text: string, weightKg: number) => number;
  onDelete: (id: string) => void;
  onToast: (msg: string) => void;
}

const TYPE_ICON: Record<string, string> = {
  Running: "🏃",
  Cycling: "🚴",
  Walking: "🚶",
  Weights: "🏋️",
  HIIT: "🔥",
  Swimming: "🏊",
  Football: "⚽",
  Basketball: "🏀",
  Rowing: "🚣",
  Boxing: "🥊",
  Tennis: "🎾",
  Yoga: "🧘",
  Elliptical: "🏃",
  Sport: "🤸",
  Workout: "💪",
};

const PLACEHOLDERS = [
  "45 min weights and 20 min cardio",
  "ran 5k",
  "1 hour football",
  "cycled 20km",
  "10000 steps",
];

export function ExerciseView({
  state,
  viewDate,
  baseTargets,
  onAdd,
  onDelete,
  onToast,
}: Props) {
  const [text, setText] = useState("");
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  );
  const weightKg = state.settings.profile?.weightKg ?? 80;
  const hasProfile = !!state.settings.profile;

  const day = state.days[viewDate];
  const exercises = day?.exercises ?? [];
  const burn = totalBurn(exercises);
  const strength = hadStrength(exercises);
  const adjusted = exerciseAdjustedTargets(baseTargets, burn, strength);
  const bonus = exerciseBonus(baseTargets, adjusted);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    const n = onAdd(t, weightKg);
    if (n > 0) {
      setText("");
      onToast(`Logged ${n} workout${n > 1 ? "s" : ""}`);
    } else {
      onToast("Couldn't read that — try e.g. '45 min weights'");
    }
  };

  // Post-workout refuel timing (today only).
  let timing: string | null = null;
  if (isToday(viewDate) && exercises.length) {
    const lastAt = Math.max(...exercises.map((e) => e.createdAt));
    const foodsAfter = (day?.foods ?? []).some((f) => f.createdAt > lastAt);
    const minsSince = Math.round((Date.now() - lastAt) / 60000);
    if (!foodsAfter && minsSince < 120) {
      const within = Math.max(15, 90 - minsSince);
      timing = `Refuel within ~${within} min of finishing — prioritise protein + carbs to recover${
        strength ? " and hold muscle" : ""
      }.`;
    } else if (foodsAfter) {
      timing = "Nice — you've already eaten since training. Keep protein high across the rest of the day.";
    }
  }

  return (
    <div>
      <div className="card food-input">
        <label htmlFor="ex-field">What exercise did you do?</label>
        <div className="row">
          <textarea
            id="ex-field"
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
          />
          <button className="add-btn" onClick={submit} disabled={!text.trim()}>
            Add
          </button>
        </div>
        <p className="hint">
          Describe it naturally — e.g. <code>45 min weights and a 5k run</code>. Burn is
          estimated from your bodyweight
          {hasProfile ? ` (${weightKg} kg)` : " (assuming 80 kg — set yours in ⚙ Settings)"}.
        </p>
      </div>

      {burn > 0 && (
        <div className="card">
          <h2 className="section-title">Impact on today's diet</h2>
          <div className="burn-hero">
            <div className="burn-num">🔥 {burn}</div>
            <div className="burn-lab">kcal burned{strength ? " · incl. resistance" : ""}</div>
          </div>
          <div className="burn-bonus">
            Added back to today:
            <div className="bb-row">
              <span><b>+{bonus.calories}</b> kcal</span>
              <span style={{ color: "var(--protein)" }}><b>+{bonus.protein}g</b> P</span>
              <span style={{ color: "var(--carbs)" }}><b>+{bonus.carbs}g</b> C</span>
              <span style={{ color: "var(--fat)" }}>+{bonus.fat}g F</span>
            </div>
          </div>
          <div className="adjusted-targets">
            <div className="at-title">Adjusted targets today</div>
            <div className="at-row">
              <span><b>{adjusted.calories}</b> kcal</span>
              <span><b>{adjusted.protein}g</b> protein</span>
              <span><b>{adjusted.carbs}g</b> carbs</span>
              <span><b>{adjusted.fat}g</b> fat</span>
            </div>
          </div>
          {timing && <div className="warn ok" style={{ marginTop: 12 }}>⏱ {timing}</div>}
          <p className="hint">
            Your dashboard, remaining totals and next-meal suggestion already use these
            adjusted numbers.
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="section-title">
          {isToday(viewDate) ? "Today's workouts" : "Workouts"}
        </h2>
        {exercises.length === 0 ? (
          <div className="empty">
            No workouts logged.
            <br />
            Describe a workout above to see how much you can eat back.
          </div>
        ) : (
          exercises.map((e) => (
            <div className="food-item" key={e.id}>
              <div className="ex-icon">{TYPE_ICON[e.type] ?? "💪"}</div>
              <div className="fi-main">
                <div className="fi-name">{e.description}</div>
                <div className="fi-qty">
                  {e.type}
                  {e.minutes ? ` · ${e.minutes} min` : ""}
                  {e.strength ? " · strength" : ""}
                </div>
              </div>
              <div className="fi-cal">🔥 {e.calories}</div>
              <div className="fi-actions">
                <button aria-label="Delete" onClick={() => onDelete(e.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
