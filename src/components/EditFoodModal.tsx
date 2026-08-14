import { useState } from "react";
import type { FoodEntry, MealType } from "../types";
import { MEAL_TYPES } from "../types";

interface Props {
  food: FoodEntry;
  onSave: (patch: Partial<FoodEntry>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EditFoodModal({ food, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(food.name);
  const [quantity, setQuantity] = useState(food.quantity);
  const [meal, setMeal] = useState<MealType>(food.meal);
  const [calories, setCalories] = useState(String(Math.round(food.calories)));
  const [protein, setProtein] = useState(String(round(food.protein)));
  const [carbs, setCarbs] = useState(String(round(food.carbs)));
  const [fat, setFat] = useState(String(round(food.fat)));

  const save = () => {
    onSave({
      name: name.trim() || food.name,
      quantity: quantity.trim(),
      meal,
      calories: num(calories),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit food</h3>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Quantity</label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 200 g, 2, 1 cup"
          />
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
        <div className="field-grid">
          <div className="field">
            <label>Calories</label>
            <input
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Protein (g)</label>
            <input
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Carbs (g)</label>
            <input
              inputMode="decimal"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Fat (g)</label>
            <input
              inputMode="decimal"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={() => { onDelete(); onClose(); }}>
            Delete
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const round = (n: number) => Math.round(n * 10) / 10;
