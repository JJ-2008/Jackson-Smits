import { useRef, useState } from "react";
import type { FoodEntry, MealType } from "../types";
import { MEAL_TYPES } from "../types";
import { compressImage } from "../lib/photo";

interface Props {
  food: FoodEntry;
  isFavourite: boolean;
  onSave: (patch: Partial<FoodEntry>) => void;
  onToggleFavourite: (fav: {
    name: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    junk?: boolean;
  }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EditFoodModal({
  food,
  isFavourite,
  onSave,
  onToggleFavourite,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(food.name);
  const [quantity, setQuantity] = useState(food.quantity);
  const [meal, setMeal] = useState<MealType>(food.meal);
  const [calories, setCalories] = useState(String(Math.round(food.calories)));
  const [protein, setProtein] = useState(String(round(food.protein)));
  const [carbs, setCarbs] = useState(String(round(food.carbs)));
  const [fat, setFat] = useState(String(round(food.fat)));
  const [junk, setJunk] = useState(!!food.junk);
  const [photo, setPhoto] = useState<string | undefined>(food.photo);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
    } catch {
      /* ignore unreadable images */
    }
  };

  const save = () => {
    onSave({
      name: name.trim() || food.name,
      quantity: quantity.trim(),
      meal,
      calories: num(calories),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
      junk,
      photo,
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

        <div className="edit-extras">
          <button
            className={`chip-toggle${isFavourite ? " fav-on" : ""}`}
            onClick={() =>
              onToggleFavourite({
                name: name.trim() || food.name,
                quantity: quantity.trim(),
                calories: num(calories),
                protein: num(protein),
                carbs: num(carbs),
                fat: num(fat),
                junk,
              })
            }
          >
            {isFavourite ? "⭐ Favourited" : "☆ Save favourite"}
          </button>
          <button
            className={`chip-toggle${junk ? " on" : ""}`}
            onClick={() => setJunk((j) => !j)}
          >
            {junk ? "🍫 Junk food" : "Mark as junk"}
          </button>
          <button className="chip-toggle" onClick={() => fileRef.current?.click()}>
            {photo ? "📷 Change photo" : "📷 Add photo"}
          </button>
          {photo && (
            <button className="chip-toggle" onClick={() => setPhoto(undefined)}>
              Remove photo
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onPickPhoto}
          />
        </div>
        {photo && <img className="edit-photo" src={photo} alt="meal" />}

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
