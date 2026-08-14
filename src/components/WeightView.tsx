import { useState } from "react";
import type { AppState, WeightUnit } from "../types";
import { weightSeries, weightSummary } from "../lib/weight";

interface Props {
  state: AppState;
  today: string;
  onSetWeight: (date: string, weight: number | undefined) => void;
  onSetUnit: (unit: WeightUnit) => void;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="empty">Log a few days to see your trend.</div>;
  }
  const w = 480;
  const h = 70;
  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (p - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(74,222,128,0.35)" />
          <stop offset="100%" stopColor="rgba(74,222,128,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#wg)" />
      <path d={path} fill="none" stroke="#4ade80" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 3.5 : 0} fill="#4ade80" />
      ))}
    </svg>
  );
}

export function WeightView({ state, today, onSetWeight, onSetUnit }: Props) {
  const unit = state.settings.weightUnit;
  const existing = state.days[today]?.bodyweight;
  const [input, setInput] = useState(existing != null ? String(existing) : "");
  const summary = weightSummary(state, today);
  const series = weightSeries(state);

  const save = () => {
    const v = parseFloat(input);
    onSetWeight(today, Number.isFinite(v) && v > 0 ? v : undefined);
  };

  const rate = summary.weeklyRate;

  return (
    <div>
      <div className="card">
        <h2 className="section-title">Morning bodyweight</h2>
        <div className="weight-input-row">
          <input
            inputMode="decimal"
            placeholder={`Today's weight (${unit})`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <div className="unit-toggle">
            <button
              className={unit === "kg" ? "active" : ""}
              onClick={() => onSetUnit("kg")}
            >
              kg
            </button>
            <button
              className={unit === "lb" ? "active" : ""}
              onClick={() => onSetUnit("lb")}
            >
              lb
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="s-lab">Today</div>
            <div className="s-val">
              {summary.today != null ? summary.today : "—"}
              <small> {unit}</small>
            </div>
          </div>
          <div className="stat">
            <div className="s-lab">7-day average</div>
            <div className="s-val">
              {summary.avg7 != null ? summary.avg7.toFixed(1) : "—"}
              <small> {unit}</small>
            </div>
          </div>
          <div className="stat">
            <div className="s-lab">Weekly rate</div>
            <div
              className={`s-val ${
                rate == null ? "" : rate < 0 ? "trend-down" : rate > 0 ? "trend-up" : ""
              }`}
            >
              {rate != null ? `${rate > 0 ? "+" : ""}${rate.toFixed(2)}` : "—"}
              <small> {unit}/wk</small>
            </div>
          </div>
          <div className="stat">
            <div className="s-lab">Trend</div>
            <div className="s-val">
              {summary.trend === "down" && "↓ Losing"}
              {summary.trend === "up" && "↑ Gaining"}
              {summary.trend === "flat" && "→ Holding"}
              {summary.trend === "none" && "—"}
            </div>
          </div>
        </div>

        {summary.warning && <div className="warn">{summary.warning}</div>}
        {!summary.warning && rate != null && summary.trend === "down" && (
          <div className="warn ok">
            Steady, controlled loss — this is the sweet spot for keeping muscle
            while cutting. Keep it up.
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Weight trend</h2>
        <Sparkline points={series.map((s) => s.weight)} />
      </div>
    </div>
  );
}
