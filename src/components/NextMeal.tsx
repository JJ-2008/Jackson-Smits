import { useEffect, useState } from "react";
import type { FoodEntry, Targets } from "../types";
import { suggestNextMeal } from "../lib/suggest";

interface Props {
  foods: FoodEntry[];
  targets: Targets;
  accutaneMode: boolean;
}

export function NextMeal({ foods, targets, accutaneMode }: Props) {
  const s = suggestNextMeal(foods, targets, new Date(), accutaneMode);
  const [idx, setIdx] = useState(0);

  // Keep the selected option in range if the option list changes.
  useEffect(() => {
    if (idx >= s.options.length) setIdx(0);
  }, [s.options.length, idx]);

  const opt = s.options[Math.min(idx, s.options.length - 1)] ?? s.options[0];
  const reroll = () => setIdx((i) => (i + 1) % s.options.length);

  return (
    <div className="card next-meal">
      <h2 className="section-title">What to eat next</h2>

      <div className="remaining-strip">
        <div className="rs">
          <div className="v">{Math.max(0, s.remaining.calories)}</div>
          <div className="l">kcal left</div>
        </div>
        <div className="rs">
          <div className="v" style={{ color: "var(--protein)" }}>
            {Math.max(0, Math.round(s.remaining.protein))}g
          </div>
          <div className="l">protein</div>
        </div>
        <div className="rs">
          <div className="v" style={{ color: "var(--carbs)" }}>
            {Math.max(0, Math.round(s.remaining.carbs))}g
          </div>
          <div className="l">carbs</div>
        </div>
        <div className="rs">
          <div className="v" style={{ color: "var(--fat)" }}>
            {Math.max(0, Math.round(s.remaining.fat))}g
          </div>
          <div className="l">fat</div>
        </div>
      </div>

      {accutaneMode && s.accutane && (
        <div className="accutane-card">
          <div className="acc-pill">💊 Accutane</div>
          <div className="acc-text">{s.accutane.text}</div>
        </div>
      )}

      <div className="nm-top">
        <div>
          <div className="nm-meal">{s.meal}</div>
          <div className="nm-optlabel">{opt.label}</div>
        </div>
        <div className="nm-when">
          <div className="lab">Recommended around</div>
          <div className="time">{s.time}</div>
        </div>
      </div>

      <div className="plate">
        {opt.items.map((it, i) => (
          <div className="p-item" key={i}>
            <span className="food">{it.food}</span>
            <span className="amt">{it.amount}</span>
          </div>
        ))}
        <div className="p-macros">
          <span><b>{opt.macros.calories}</b> kcal</span>
          <span><b>{opt.macros.protein}g</b> protein</span>
          <span><b>{opt.macros.carbs}g</b> carbs</span>
          <span><b>{opt.macros.fat}g</b> fat</span>
        </div>
      </div>

      <div className="reroll-row">
        <button className="reroll-btn" onClick={reroll}>
          🔄 Show another option
        </button>
        <span className="reroll-count">
          {Math.min(idx, s.options.length - 1) + 1} / {s.options.length}
        </span>
      </div>

      <p className="nm-note">{s.note}</p>
    </div>
  );
}
