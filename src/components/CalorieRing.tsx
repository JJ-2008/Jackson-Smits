interface Props {
  consumed: number;
  target: number;
}

export function CalorieRing({ consumed, target }: Props) {
  const size = 230;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = target > 0 ? consumed / target : 0;
  const clamped = Math.max(0, Math.min(1, ratio));
  const over = consumed > target;
  const remaining = Math.round(target - consumed);
  const dash = c * clamped;

  return (
    <div className="ring-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="55%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <linearGradient id="ringOver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "url(#ringOver)" : "url(#ringGrad)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="ring-center">
        <div className="consumed">{Math.round(consumed).toLocaleString()}</div>
        <div className="of-target">of {target.toLocaleString()} kcal</div>
        <div className={`remaining${over ? " over" : ""}`}>
          {over ? "Over by" : "Remaining"}
          <b>{Math.abs(remaining).toLocaleString()} kcal</b>
        </div>
      </div>
    </div>
  );
}
