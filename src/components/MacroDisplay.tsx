import type { Macros, Targets } from "../types";
import { pct } from "../lib/nutrition";

const COLORS = {
  protein: "var(--protein)",
  carbs: "var(--carbs)",
  fat: "var(--fat)",
};

interface RowProps {
  name: string;
  color: string;
  value: number;
  target: number;
  unit?: string;
}

function MacroRow({ name, color, value, target, unit = "g" }: RowProps) {
  const p = pct(value, target) * 100;
  const left = Math.max(0, Math.round((target - value) * 10) / 10);
  return (
    <div className="macro-row">
      <div className="mr-head">
        <span className="mr-name">{name}</span>
        <span className="mr-val">
          <b>
            {Math.round(value * 10) / 10}
            {unit}
          </b>{" "}
          / {target}
          {unit} · {left}
          {unit} left
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}

export function MacroRows({
  totals,
  targets,
}: {
  totals: Macros;
  targets: Targets;
}) {
  return (
    <div className="macro-rows">
      <MacroRow name="Protein" color={COLORS.protein} value={totals.protein} target={targets.protein} />
      <MacroRow name="Carbs" color={COLORS.carbs} value={totals.carbs} target={targets.carbs} />
      <MacroRow name="Fat" color={COLORS.fat} value={totals.fat} target={targets.fat} />
    </div>
  );
}

interface CardProps {
  label: string;
  color: string;
  value: number;
  target: number;
}
function MacroCard({ label, color, value, target }: CardProps) {
  const p = pct(value, target) * 100;
  const left = Math.max(0, Math.round((target - value) * 10) / 10);
  return (
    <div className="macro-card">
      <div className="m-label" style={{ color }}>
        {label}
      </div>
      <div className="m-value">
        {Math.round(value)}
        <span>/{target}g</span>
      </div>
      <div className="m-left">{left}g left</div>
      <div className="mini-bar">
        <i style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}

export function MacroCards({
  totals,
  targets,
}: {
  totals: Macros;
  targets: Targets;
}) {
  return (
    <div className="macro-grid">
      <MacroCard label="Protein" color={COLORS.protein} value={totals.protein} target={targets.protein} />
      <MacroCard label="Carbs" color={COLORS.carbs} value={totals.carbs} target={targets.carbs} />
      <MacroCard label="Fat" color={COLORS.fat} value={totals.fat} target={targets.fat} />
    </div>
  );
}
