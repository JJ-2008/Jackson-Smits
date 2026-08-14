import { useState } from "react";
import type { Targets } from "../types";
import { DEFAULT_SETTINGS } from "../lib/storage";

interface Props {
  targets: Targets;
  onSave: (t: Targets) => void;
  onClose: () => void;
}

export function SettingsModal({ targets, onSave, onClose }: Props) {
  const [calories, setCalories] = useState(String(targets.calories));
  const [protein, setProtein] = useState(String(targets.protein));
  const [carbs, setCarbs] = useState(String(targets.carbs));
  const [fat, setFat] = useState(String(targets.fat));

  const save = () => {
    onSave({
      calories: num(calories, targets.calories),
      protein: num(protein, targets.protein),
      carbs: num(carbs, targets.carbs),
      fat: num(fat, targets.fat),
    });
    onClose();
  };

  const reset = () => {
    const d = DEFAULT_SETTINGS.targets;
    setCalories(String(d.calories));
    setProtein(String(d.protein));
    setCarbs(String(d.carbs));
    setFat(String(d.fat));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Daily targets</h3>
        <div className="field">
          <label>Calories (kcal)</label>
          <input inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
        <div className="field-grid">
          <div className="field">
            <label>Protein (g)</label>
            <input inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div className="field">
            <label>Carbs (g)</label>
            <input inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div className="field">
            <label>Fat (g)</label>
            <input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-ghost" onClick={reset} style={{ padding: "12px" }}>
              Reset defaults
            </button>
          </div>
        </div>
        <p className="hint">
          Cutting priority: protein first, stay near your calorie target, keep
          enough dietary fat, then carbs fill the rest.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const num = (s: string, fallback: number) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};
