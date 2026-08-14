import type { FoodEntry, Targets } from "../types";
import { suggestNextMeal } from "../lib/suggest";

interface Props {
  foods: FoodEntry[];
  targets: Targets;
}

export function NextMeal({ foods, targets }: Props) {
  const s = suggestNextMeal(foods, targets);

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

      <div className="nm-top">
        <div className="nm-meal">{s.meal}</div>
        <div className="nm-when">
          <div className="lab">Recommended around</div>
          <div className="time">{s.time}</div>
        </div>
      </div>

      <div className="plate">
        {s.items.map((it, i) => (
          <div className="p-item" key={i}>
            <span className="food">{it.food}</span>
            <span className="amt">{it.amount}</span>
          </div>
        ))}
        <div className="p-macros">
          <span>
            <b>{s.macros.calories}</b> kcal
          </span>
          <span>
            <b>{s.macros.protein}g</b> protein
          </span>
          <span>
            <b>{s.macros.carbs}g</b> carbs
          </span>
          <span>
            <b>{s.macros.fat}g</b> fat
          </span>
        </div>
      </div>

      <p className="nm-note">{s.note}</p>
    </div>
  );
}
