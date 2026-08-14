import type { FoodEntry, MealType } from "../types";
import { MEAL_TYPES } from "../types";
import { groupByMeal, sumMacros } from "../lib/nutrition";

interface Props {
  foods: FoodEntry[];
  onEdit: (food: FoodEntry) => void;
  onDelete: (id: string) => void;
}

const MEAL_ICON: Record<MealType, string> = {
  Breakfast: "🌅",
  Lunch: "🥗",
  Dinner: "🍽️",
  Snacks: "🍎",
};

export function MealList({ foods, onEdit, onDelete }: Props) {
  if (!foods.length) {
    return (
      <div className="card">
        <h2 className="section-title">Today's meals</h2>
        <div className="empty">
          Nothing logged yet.
          <br />
          Tell the app what you've eaten to get started.
        </div>
      </div>
    );
  }

  const groups = groupByMeal(foods);

  return (
    <div className="card">
      <h2 className="section-title">Today's meals</h2>
      {MEAL_TYPES.filter((m) => groups[m].length > 0).map((meal) => {
        const items = groups[meal];
        const total = sumMacros(items);
        return (
          <div className="meal-group" key={meal}>
            <div className="meal-group-head">
              <span className="mg-name">
                {MEAL_ICON[meal]} {meal}
              </span>
              <span className="mg-cal">{Math.round(total.calories)} kcal</span>
            </div>
            {items.map((f) => (
              <div className="food-item" key={f.id}>
                <div className="fi-main" onClick={() => onEdit(f)}>
                  <div className="fi-name">
                    {f.name}
                    {f.estimated && <span className="est-tag">est</span>}
                  </div>
                  <div className="fi-qty">{f.quantity}</div>
                  <div className="fi-macros">
                    <span className="p">P {Math.round(f.protein)}g</span>
                    <span className="c">C {Math.round(f.carbs)}g</span>
                    <span className="f">F {Math.round(f.fat)}g</span>
                  </div>
                </div>
                <div className="fi-cal">{Math.round(f.calories)}</div>
                <div className="fi-actions">
                  <button aria-label="Edit" onClick={() => onEdit(f)}>
                    ✎
                  </button>
                  <button aria-label="Delete" onClick={() => onDelete(f.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
