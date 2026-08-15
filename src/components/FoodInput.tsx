import { useState } from "react";
import { MEAL_TYPES, type MealType } from "../types";

interface Props {
  defaultMeal: MealType;
  onAdd: (text: string, meal: MealType) => number;
  onScan: () => void;
  onPhoto: () => void;
}

const PLACEHOLDERS = [
  "200g chicken breast and 250g cooked rice",
  "3 eggs in an omelette and 3 cups of lemon water",
  "Protein shake with milk and banana",
  "I had a steak and chips",
  "2 eggs, toast and avocado",
];

export function FoodInput({ defaultMeal, onAdd, onScan, onPhoto }: Props) {
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  );

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    const n = onAdd(t, meal);
    if (n > 0) setText("");
  };

  return (
    <div className="card food-input">
      <label htmlFor="food-field">What did you eat?</label>
      <div className="row">
        <textarea
          id="food-field"
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
      <div className="input-actions">
        <button className="scan-btn" onClick={onScan}>
          📷 Scan barcode
        </button>
        <button className="scan-btn" onClick={onPhoto}>
          🍽️ Photo estimate
        </button>
      </div>
      <p className="hint">
        Type naturally — e.g. <code>200g chicken breast and 250g cooked rice</code>.
        Estimates are auto-calculated and fully editable.
      </p>
    </div>
  );
}
