import { useEffect, useMemo, useRef, useState } from "react";
import type { Activity, AppState, GoalType, Profile, Settings, Targets } from "../types";
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  computeTargets,
  parseGoalText,
  DEFAULT_PROFILE,
} from "../lib/goals";
import { parseBackup, readFileText } from "../lib/backup";
import { AI_MODELS, type AIConfig } from "../lib/aiConfig";
import { listChatModels, AIError } from "../lib/aiParser";

type ModelOption = { id: string; label: string; note?: string };

interface Props {
  settings: Settings;
  ai: AIConfig;
  onSaveAi: (cfg: AIConfig) => void;
  onApplyProfile: (p: Profile) => void;
  onSetTargets: (t: Targets) => void;
  onSetSettings: (patch: Partial<Settings>) => void;
  onExportBackup: () => void;
  onImportState: (state: AppState) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}

const num = (s: string, fb: number) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : fb;
};

export function SettingsModal({
  settings,
  ai,
  onSaveAi,
  onApplyProfile,
  onSetTargets,
  onSetSettings,
  onExportBackup,
  onImportState,
  onToast,
  onClose,
}: Props) {
  const importRef = useRef<HTMLInputElement>(null);

  // AI (bring-your-own-key) local editing state.
  const [aiKey, setAiKey] = useState(ai.apiKey);
  const [aiModel, setAiModel] = useState(ai.model);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ModelOption[]>(AI_MODELS);
  const [detecting, setDetecting] = useState(false);
  const aiEnabled = ai.enabled && ai.apiKey.trim().length > 0;

  // Ask the key which models it can actually use, and fix the selection if the
  // saved one isn't in the list (this is what clears "model isn't available").
  const detectModels = async (silent = false) => {
    const key = aiKey.trim();
    if (!key) {
      if (!silent) onToast("Paste your key first.");
      return;
    }
    setDetecting(true);
    try {
      const found = await listChatModels(key);
      if (!found.length) {
        if (!silent) onToast("No usable models for that key.");
        return;
      }
      setModels(found);
      const nextModel = found.some((m) => m.id === aiModel) ? aiModel : found[0].id;
      if (nextModel !== aiModel) setAiModel(nextModel);
      onSaveAi({ apiKey: key, model: nextModel, enabled: ai.enabled });
      if (!silent) onToast(`Found ${found.length} model${found.length > 1 ? "s" : ""} ✓`);
    } catch (e) {
      onToast(e instanceof AIError ? e.message : "Couldn't check models.");
    } finally {
      setDetecting(false);
    }
  };

  // On open, if a key is already saved, quietly refresh the usable model list.
  const didAutoDetect = useRef(false);
  useEffect(() => {
    if (didAutoDetect.current) return;
    didAutoDetect.current = true;
    if (ai.apiKey.trim()) detectModels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAi = () => {
    const key = aiKey.trim();
    if (!ai.enabled && !key) {
      onToast("Paste your free Google key first.");
      return;
    }
    onSaveAi({ apiKey: key, model: aiModel, enabled: !ai.enabled });
    onToast(!ai.enabled ? "Smart AI logging on ✨" : "AI logging off");
  };

  const saveAiKey = async () => {
    const key = aiKey.trim();
    onSaveAi({ apiKey: key, model: aiModel, enabled: ai.enabled });
    if (key) {
      await detectModels();
    } else {
      onToast("AI key cleared");
    }
  };

  const onPickBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await readFileText(file);
      const state = parseBackup(text);
      const dayCount = Object.keys(state.days).length;
      if (!confirm(`Restore this backup? It has ${dayCount} day(s) of data and will replace what's currently in the app.`))
        return;
      onImportState(state);
      onToast("Backup restored");
      onClose();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Couldn't import that file");
    }
  };
  const initial: Profile = settings.profile ?? { ...DEFAULT_PROFILE };

  const [goalText, setGoalText] = useState(initial.goalText ?? "");
  const [sex, setSex] = useState(initial.sex);
  const [age, setAge] = useState(String(initial.age));
  const [height, setHeight] = useState(String(initial.heightCm));
  const [weight, setWeight] = useState(String(initial.weightKg));
  const [activity, setActivity] = useState<Activity>(initial.activity);
  const [goal, setGoal] = useState<GoalType>(initial.goal);

  // manual override fields
  const [cal, setCal] = useState(String(settings.targets.calories));
  const [pro, setPro] = useState(String(settings.targets.protein));
  const [carb, setCarb] = useState(String(settings.targets.carbs));
  const [fat, setFat] = useState(String(settings.targets.fat));

  const profile: Profile = useMemo(
    () => ({
      sex,
      age: num(age, 18),
      heightCm: num(height, 178),
      weightKg: num(weight, 80),
      activity,
      goal,
      goalText: goalText || undefined,
    }),
    [sex, age, height, weight, activity, goal, goalText]
  );

  const preview = useMemo(() => computeTargets(profile), [profile]);

  const applyGoalText = () => {
    const hints = parseGoalText(goalText);
    if (hints.goal) setGoal(hints.goal);
    if (hints.sex) setSex(hints.sex);
    if (hints.weightKg) setWeight(String(hints.weightKg));
    if (hints.heightCm) setHeight(String(hints.heightCm));
    if (hints.age) setAge(String(hints.age));
  };

  const saveCalculated = () => {
    onApplyProfile(profile);
    onClose();
  };

  const saveManual = () => {
    onSetTargets({
      calories: Math.round(num(cal, settings.targets.calories)),
      protein: Math.round(num(pro, settings.targets.protein)),
      carbs: Math.round(num(carb, settings.targets.carbs)),
      fat: Math.round(num(fat, settings.targets.fat)),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-tall" onClick={(e) => e.stopPropagation()}>
        <h3>Goals &amp; settings</h3>

        <div className="settings-section">
          <div className="ss-title">Describe your goal</div>
          <div className="field">
            <input
              value={goalText}
              placeholder="e.g. lose fat but keep muscle, I'm 82kg"
              onChange={(e) => setGoalText(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" onClick={applyGoalText} style={{ width: "100%" }}>
            ✨ Read my goal &amp; fill in below
          </button>
        </div>

        <div className="settings-section">
          <div className="ss-title">Your details</div>
          <div className="field-grid">
            <div className="field">
              <label>Sex</label>
              <select value={sex} onChange={(e) => setSex(e.target.value as Profile["sex"])}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="field">
              <label>Age</label>
              <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="field">
              <label>Height (cm)</label>
              <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="field">
              <label>Weight (kg)</label>
              <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Activity</label>
            <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
              {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Goal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value as GoalType)}>
              {(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABEL[g]}
                </option>
              ))}
            </select>
          </div>

          <div className="calc-preview">
            <div className="cp-title">Calculated targets</div>
            <div className="cp-row">
              <span><b>{preview.calories}</b> kcal</span>
              <span style={{ color: "var(--protein)" }}><b>{preview.protein}g</b> P</span>
              <span style={{ color: "var(--carbs)" }}><b>{preview.carbs}g</b> C</span>
              <span style={{ color: "var(--fat)" }}><b>{preview.fat}g</b> F</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveCalculated} style={{ width: "100%" }}>
            Use these calculated targets
          </button>
        </div>

        <div className="settings-section">
          <div className="ss-title">Or set targets manually</div>
          <div className="field">
            <label>Calories</label>
            <input inputMode="numeric" value={cal} onChange={(e) => setCal(e.target.value)} />
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Protein (g)</label>
              <input inputMode="numeric" value={pro} onChange={(e) => setPro(e.target.value)} />
            </div>
            <div className="field">
              <label>Carbs (g)</label>
              <input inputMode="numeric" value={carb} onChange={(e) => setCarb(e.target.value)} />
            </div>
            <div className="field">
              <label>Fat (g)</label>
              <input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={saveManual}>
                Save manual
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="toggle-row">
            <div>
              <div className="ss-title" style={{ marginBottom: 2 }}>Accutane mode</div>
              <div className="toggle-sub">
                Shows which meal to take your dose with (your fattiest meal) for best absorption.
              </div>
            </div>
            <button
              className={`switch${settings.accutaneMode ? " on" : ""}`}
              onClick={() => onSetSettings({ accutaneMode: !settings.accutaneMode })}
              aria-label="Toggle Accutane mode"
            >
              <span />
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="toggle-row">
            <div>
              <div className="ss-title" style={{ marginBottom: 2 }}>
                Smart AI logging ✨ <span className="ai-free">free</span>
              </div>
              <div className="toggle-sub">
                Describe meals in plain words and let AI work out the items and
                macros. Uses a free Google Gemini key — no card and no ABN needed.
                It stays on this device and is never included in backups.
              </div>
            </div>
            <button
              className={`switch${aiEnabled ? " on" : ""}`}
              onClick={toggleAi}
              aria-label="Toggle smart AI logging"
            >
              <span />
            </button>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Google API key</label>
            <div className="row">
              <input
                type={showKey ? "text" : "password"}
                value={aiKey}
                placeholder="AIza…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => setAiKey(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                style={{ flex: "0 0 auto" }}
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Model</label>
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.note ? ` — ${m.note}` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginBottom: 8 }}
            onClick={() => detectModels()}
            disabled={detecting}
          >
            {detecting ? "Checking…" : "🔍 Check which models my key can use"}
          </button>

          <button className="btn btn-primary" style={{ width: "100%" }} onClick={saveAiKey}>
            Save key &amp; model
          </button>
          <div className="toggle-sub" style={{ marginTop: 8 }}>
            Get a free key at <b>aistudio.google.com/app/apikey</b> → “Create API
            key”. Just needs a Google account — no card, no charge, no ABN.
          </div>
        </div>

        <div className="settings-section">
          <div className="ss-title">Your data &amp; backup</div>
          <div className="toggle-sub" style={{ marginBottom: 10 }}>
            Everything is stored on this device only. Export a backup regularly so
            you don't lose your history if you clear your browser or switch phones.
          </div>
          <div className="data-actions">
            <button className="btn btn-primary" onClick={onExportBackup}>
              ⬇ Export backup
            </button>
            <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
              ⬆ Import backup
            </button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onPickBackup}
          />
        </div>

        <p className="hint">
          Estimates only — not medical advice. Targets follow cutting priorities:
          protein first, sensible (non-extreme) deficit, enough fat, carbs fill the rest.
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
