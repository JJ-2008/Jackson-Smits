import { useMemo, useState } from "react";
import type { Activity, GoalType, Profile, Settings, Targets } from "../types";
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  computeTargets,
  parseGoalText,
  DEFAULT_PROFILE,
} from "../lib/goals";

interface Props {
  settings: Settings;
  onApplyProfile: (p: Profile) => void;
  onSetTargets: (t: Targets) => void;
  onSetSettings: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

const num = (s: string, fb: number) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : fb;
};

export function SettingsModal({
  settings,
  onApplyProfile,
  onSetTargets,
  onSetSettings,
  onClose,
}: Props) {
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
