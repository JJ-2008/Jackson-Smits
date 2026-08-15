import { useRef, useState } from "react";
import { MEAL_TYPES, type MealType, type Macros } from "../types";
import {
  matchFromPredictions,
  scaleMacros,
  type PhotoMatch,
} from "../lib/photoEstimate";
import { compressImage } from "../lib/photo";

// Cache the model across opens — it's a few MB and only needs loading once.
let modelPromise: Promise<any> | null = null;
async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const mobilenet = await import("@tensorflow-models/mobilenet");
      return mobilenet.load({ version: 2, alpha: 1.0 });
    })();
  }
  return modelPromise;
}

interface Props {
  defaultMeal: MealType;
  onAdd: (
    food: { name: string; quantity: string; macros: Macros; photo?: string },
    meal: MealType
  ) => void;
  onClose: () => void;
}

type Phase = "pick" | "analysing" | "confirm" | "error";

export function PhotoEstimator({ defaultMeal, onAdd, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [match, setMatch] = useState<PhotoMatch | null>(null);

  // editable confirm fields
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("100");
  const [per100g, setPer100g] = useState<Macros | null>(null);
  const [manual, setManual] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meal, setMeal] = useState<MealType>(defaultMeal);

  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  const applyMatch = (m: PhotoMatch) => {
    setMatch(m);
    if (m.best) {
      setName(m.best.name);
      setGrams(String(m.best.servingG));
      setPer100g(m.best.per100g);
    } else {
      // no confident food — seed from the top label, let the user fill macros
      setName(m.topGuesses[0] ? title(m.topGuesses[0]) : "");
      setGrams("1 serving");
      setPer100g(null);
      setManual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
    setPhase("confirm");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase("analysing");
    setError("");
    const objectUrl = URL.createObjectURL(file);
    try {
      // thumbnail for storage + full image for the classifier
      compressImage(file).then(setPhoto).catch(() => {});
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      const model = await getModel();
      const preds = await model.classify(img, 6);
      applyMatch(matchFromPredictions(preds));
    } catch {
      setPhase("error");
      setError(
        "Couldn't analyse that photo. It needs a connection the first time to load the recogniser. You can still add the food by hand."
      );
      compressImage(file).then(setPhoto).catch(() => {});
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const pickAlternative = (i: number) => {
    if (!match) return;
    const alt = match.alternatives[i];
    if (!alt) return;
    setName(alt.name);
    setGrams(String(alt.servingG));
    setPer100g(alt.per100g);
  };

  const currentMacros = (): Macros =>
    per100g ? scaleMacros(parseFloat(grams) || 0, per100g) : manual;

  const confirm = () => {
    const g = parseFloat(grams) || 0;
    onAdd(
      {
        name: name.trim() || "Photo estimate",
        quantity: per100g ? `${Math.round(g)} g` : grams.trim() || "1 serving",
        macros: currentMacros(),
        photo,
      },
      meal
    );
    onClose();
  };

  const m = currentMacros();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-tall" onClick={(e) => e.stopPropagation()}>
        <h3>Estimate from photo</h3>

        {phase === "pick" && (
          <div>
            <p className="hint" style={{ marginTop: 0 }}>
              Snap your meal and it'll guess the food and a typical portion. Works
              best on a single dish. Everything is an estimate you can edit.
            </p>
            <div className="photo-pick">
              <button className="btn btn-primary" onClick={() => camRef.current?.click()}>
                📷 Take a photo
              </button>
              <button className="btn btn-ghost" onClick={() => libRef.current?.click()}>
                🖼 Choose from library
              </button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFile} />
            <input ref={libRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        )}

        {phase === "analysing" && (
          <div className="photo-analysing">
            {photo && <img className="photo-preview" src={photo} alt="" />}
            <div className="spinner" />
            <p className="hint" style={{ textAlign: "center" }}>Recognising your food…</p>
          </div>
        )}

        {phase === "confirm" && (
          <div>
            {photo && <img className="photo-preview" src={photo} alt="meal" />}

            {match?.best ? (
              <div className="photo-guess">
                Best guess:{" "}
                <b>{match.best.name}</b>{" "}
                <span className="conf">~{Math.round(match.best.confidence * 100)}% sure</span>
              </div>
            ) : (
              <div className="photo-guess muted">
                Not confident on this one — check the name and fill in the macros.
                {match?.topGuesses.length ? ` Saw: ${match.topGuesses.slice(0, 3).join(", ")}.` : ""}
              </div>
            )}

            {match && match.alternatives.length > 0 && (
              <div className="alt-chips">
                <span className="alt-label">Or:</span>
                {match.alternatives.map((a, i) => (
                  <button key={a.name} className="alt-chip" onClick={() => pickAlternative(i)}>
                    {a.name}
                  </button>
                ))}
              </div>
            )}

            <div className="field">
              <label>Food</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>{per100g ? "Amount (grams)" : "Amount"}</label>
              <input inputMode={per100g ? "numeric" : "text"} value={grams} onChange={(e) => setGrams(e.target.value)} />
            </div>

            {per100g ? (
              <div className="scan-macros">
                <span><b>{Math.round(m.calories)}</b> kcal</span>
                <span><b>{Math.round(m.protein)}g</b> P</span>
                <span><b>{Math.round(m.carbs)}g</b> C</span>
                <span><b>{Math.round(m.fat)}g</b> F</span>
              </div>
            ) : (
              <div className="field-grid">
                <div className="field"><label>Calories</label><input inputMode="numeric" value={String(manual.calories)} onChange={(e) => setManual({ ...manual, calories: n(e.target.value) })} /></div>
                <div className="field"><label>Protein (g)</label><input inputMode="decimal" value={String(manual.protein)} onChange={(e) => setManual({ ...manual, protein: n(e.target.value) })} /></div>
                <div className="field"><label>Carbs (g)</label><input inputMode="decimal" value={String(manual.carbs)} onChange={(e) => setManual({ ...manual, carbs: n(e.target.value) })} /></div>
                <div className="field"><label>Fat (g)</label><input inputMode="decimal" value={String(manual.fat)} onChange={(e) => setManual({ ...manual, fat: n(e.target.value) })} /></div>
              </div>
            )}

            <div className="field">
              <label>Meal</label>
              <div className="meal-tabs">
                {MEAL_TYPES.map((mt) => (
                  <button key={mt} className={`meal-tab${mt === meal ? " active" : ""}`} onClick={() => setMeal(mt)}>
                    {mt}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPhase("pick")}>Retake</button>
              <button className="btn btn-primary" onClick={confirm}>Add food</button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div>
            {photo && <img className="photo-preview" src={photo} alt="" />}
            <p className="hint">{error}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => applyMatch({ best: null, alternatives: [], topGuesses: [] })}>
                Add by hand
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const n = (s: string) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
};
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
