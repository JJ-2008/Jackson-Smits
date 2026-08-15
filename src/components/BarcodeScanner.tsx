import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { MEAL_TYPES, type MealType, type Macros } from "../types";
import { lookupBarcode, scaleTo } from "../lib/openfoodfacts";

interface Props {
  defaultMeal: MealType;
  onAdd: (
    food: { name: string; quantity: string; macros: Macros },
    meal: MealType
  ) => void;
  onClose: () => void;
}

type Phase = "scanning" | "looking-up" | "confirm" | "not-found" | "error";

interface Found {
  name: string;
  brand?: string;
  per100g: Macros;
  grams: number;
}

export function BarcodeScanner({ defaultMeal, onAdd, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [phase, setPhase] = useState<Phase>("scanning");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const doneRef = useRef(false);

  const stopCamera = () => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
  };

  const handleCode = async (code: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopCamera();
    setPhase("looking-up");
    try {
      const res = await lookupBarcode(code);
      if (res.found) {
        setFound({
          name: res.brand ? `${res.name} (${res.brand})` : res.name,
          per100g: res.per100g,
          grams: res.servingG && res.servingG > 0 ? res.servingG : 100,
        });
        setPhase("confirm");
      } else {
        setPhase("not-found");
      }
    } catch {
      setPhase("error");
      setError("Couldn't reach the food database. Check your connection and try again.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, controls) => {
          controlsRef.current = controls;
          if (result && !cancelled) handleCode(result.getText());
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch(() => {
        setPhase("error");
        setError(
          "Camera unavailable. You can type the barcode number below instead."
        );
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmAdd = () => {
    if (!found) return;
    const macros = scaleTo(found.grams, found.per100g);
    onAdd(
      { name: found.name, quantity: `${Math.round(found.grams)} g`, macros },
      meal
    );
    onClose();
  };

  const retry = () => {
    doneRef.current = false;
    setFound(null);
    setError("");
    setPhase("scanning");
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, controls) => {
          controlsRef.current = controls;
          if (result) handleCode(result.getText());
        }
      )
      .catch(() => setPhase("error"));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Scan a barcode</h3>

        {(phase === "scanning" || phase === "looking-up") && (
          <>
            <div className="scanner-view">
              <video ref={videoRef} playsInline muted />
              <div className="scanner-frame" />
            </div>
            <p className="hint" style={{ textAlign: "center" }}>
              {phase === "looking-up"
                ? "Looking up product…"
                : "Point the camera at the product barcode."}
            </p>
          </>
        )}

        {phase === "confirm" && found && (
          <div>
            <div className="field">
              <label>Product</label>
              <input
                value={found.name}
                onChange={(e) => setFound({ ...found, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Amount (grams)</label>
              <input
                inputMode="numeric"
                value={String(found.grams)}
                onChange={(e) =>
                  setFound({ ...found, grams: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="scan-macros">
              {(() => {
                const m = scaleTo(found.grams, found.per100g);
                return (
                  <>
                    <span><b>{Math.round(m.calories)}</b> kcal</span>
                    <span><b>{Math.round(m.protein)}g</b> P</span>
                    <span><b>{Math.round(m.carbs)}g</b> C</span>
                    <span><b>{Math.round(m.fat)}g</b> F</span>
                  </>
                );
              })()}
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
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={retry}>
                Rescan
              </button>
              <button className="btn btn-primary" onClick={confirmAdd}>
                Add food
              </button>
            </div>
          </div>
        )}

        {(phase === "not-found" || phase === "error") && (
          <div>
            <p className="hint">
              {phase === "not-found"
                ? "That barcode isn't in the food database. Type the number to retry, or add it by text instead."
                : error}
            </p>
            <div className="field">
              <label>Barcode number</label>
              <input
                inputMode="numeric"
                value={manual}
                placeholder="e.g. 5000159407236"
                onChange={(e) => setManual(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!manual.trim()) return;
                  doneRef.current = false;
                  handleCode(manual.trim());
                }}
              >
                Look up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
