import { useEffect, useState } from "react";
import { MEAL_TYPES, type MealType } from "../types";

interface Props {
  defaultMeal: MealType;
  onAdd: (text: string, meal: MealType) => number | Promise<number>;
  onScan: () => void;
  onPhoto: () => void;
  aiEnabled?: boolean;
  cooldownUntil?: number; // epoch ms the free AI limit resets, 0 if not limited
  cooldownDaily?: boolean; // true when it's the daily quota (long wait)
}

const PLACEHOLDERS = [
  "200g chicken breast and 250g cooked rice",
  "3 eggs in an omelette and 3 cups of lemon water",
  "Protein shake with milk and banana",
  "I had a steak and chips",
  "2 eggs, toast and avocado",
];

const AI_PLACEHOLDERS = [
  "a chicken caesar wrap and a flat white",
  "medium Nando's with peri chips and a coke",
  "two slices of pepperoni pizza and garlic bread",
  "a bowl of porridge with honey, blueberries and a coffee",
  "leftover katsu curry, about a plateful",
];

export function FoodInput({
  defaultMeal,
  onAdd,
  onScan,
  onPhoto,
  aiEnabled,
  cooldownUntil = 0,
  cooldownDaily = false,
}: Props) {
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [placeholder] = useState(() => {
    const list = aiEnabled ? AI_PLACEHOLDERS : PLACEHOLDERS;
    return list[Math.floor(Math.random() * list.length)];
  });

  // Tick a live countdown while the free AI limit is cooling down.
  useEffect(() => {
    if (!cooldownUntil) return;
    setNow(Date.now());
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownUntil) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const cooling = cooldownUntil > now;
  const remain = cooling ? Math.ceil((cooldownUntil - now) / 1000) : 0;
  // Short waits show m:ss; long (daily) waits show h m.
  const clock =
    remain >= 3600
      ? `${Math.floor(remain / 3600)}h ${Math.floor((remain % 3600) / 60)}m`
      : `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
  const resetAt = cooling
    ? new Date(cooldownUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const n = await onAdd(t, meal);
      if (n > 0) setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card food-input">
      <label htmlFor="food-field">
        What did you eat?
        {aiEnabled && !cooling && <span className="ai-chip">✨ AI</span>}
        {cooling && (
          <span className="ai-cooldown">
            ⏳ {cooldownDaily ? `Daily limit · back ~${resetAt}` : `Free AI back in ${clock}`}
          </span>
        )}
      </label>
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
          disabled={busy}
        />
        <button className="add-btn" onClick={submit} disabled={!text.trim() || busy}>
          {busy ? <span className="spinner" aria-label="Thinking" /> : "Add"}
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
        {cooling && cooldownDaily ? (
          <>
            Daily free AI limit reached — resets around <b>{resetAt}</b>. Logging
            with the built-in estimator until then. Tip: switching the model in
            Settings gives a separate daily allowance. Everything stays editable.
          </>
        ) : cooling ? (
          <>
            Free AI limit hit — resets in <b>{clock}</b>. Logging with the
            built-in estimator until then. Everything stays editable.
          </>
        ) : aiEnabled ? (
          <>
            Describe your meal like you'd say it out loud — the AI works out the
            items and macros. Everything stays editable.
          </>
        ) : (
          <>
            Type naturally — e.g. <code>200g chicken breast and 250g cooked rice</code>.
            Estimates are auto-calculated and fully editable.
          </>
        )}
      </p>
    </div>
  );
}
