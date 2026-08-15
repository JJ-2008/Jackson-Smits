import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

/** Animated opening splash — a calorie ring draws itself, then the app reveals. */
export function SplashScreen({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduce =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 500 : 2050;
    const t1 = setTimeout(() => setLeaving(true), total - 480);
    const t2 = setTimeout(onDone, total);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className={`splash${leaving ? " splash-leaving" : ""}`} aria-hidden="true">
      <div className="splash-inner">
        <div className="splash-ring">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="splashGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5eead4" />
                <stop offset="55%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#a3e635" />
              </linearGradient>
            </defs>
            <circle className="splash-track" cx="60" cy="60" r="52" />
            <circle className="splash-progress" cx="60" cy="60" r="52" />
          </svg>
          <div className="splash-flame">🔥</div>
        </div>

        <div className="splash-word">
          <span style={{ animationDelay: "0.35s" }}>C</span>
          <span style={{ animationDelay: "0.45s" }}>U</span>
          <span style={{ animationDelay: "0.55s" }}>T</span>
        </div>

        <div className="splash-dots">
          <i style={{ background: "var(--protein)", animationDelay: "0.7s" }} />
          <i style={{ background: "var(--carbs)", animationDelay: "0.8s" }} />
          <i style={{ background: "var(--fat)", animationDelay: "0.9s" }} />
        </div>

        <div className="splash-tag">Nutrition &amp; cutting tracker</div>
      </div>
    </div>
  );
}
