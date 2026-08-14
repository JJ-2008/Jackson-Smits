import type { AppState, DayLog, Targets } from "../types";
import { dayTotals } from "../lib/nutrition";
import { formatShortDate, isToday, recentDayKeys } from "../lib/date";

interface Props {
  state: AppState;
  today: string;
}

function hitTargets(day: DayLog, targets: Targets): boolean {
  const t = dayTotals(day);
  if (t.calories === 0) return false;
  // "Hit" = protein met and calories within 10% of target.
  const proteinOk = t.protein >= targets.protein * 0.95;
  const calOk = Math.abs(t.calories - targets.calories) <= targets.calories * 0.1;
  return proteinOk && calOk;
}

export function HistoryView({ state, today }: Props) {
  const targets = state.settings.targets;
  const unit = state.settings.weightUnit;
  const keys = recentDayKeys(7, today).reverse(); // newest first for the list

  // Weekly averages over logged days only.
  const logged = keys
    .map((k) => state.days[k])
    .filter((d): d is DayLog => !!d && d.foods.length > 0);

  const avg = logged.length
    ? logged.reduce(
        (a, d) => {
          const t = dayTotals(d);
          return {
            calories: a.calories + t.calories,
            protein: a.protein + t.protein,
            carbs: a.carbs + t.carbs,
            fat: a.fat + t.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
    : null;
  const n = logged.length || 1;

  const totalCalMax = Math.max(targets.calories, ...keys.map((k) => dayTotals(state.days[k]).calories));

  return (
    <div>
      <div className="card">
        <h2 className="section-title">Weekly overview</h2>
        {avg ? (
          <>
            <div className="week-summary">
              <div className="ws">
                <div className="v">{Math.round(avg.calories / n)}</div>
                <div className="l">kcal</div>
              </div>
              <div className="ws">
                <div className="v" style={{ color: "var(--protein)" }}>
                  {Math.round(avg.protein / n)}g
                </div>
                <div className="l">protein</div>
              </div>
              <div className="ws">
                <div className="v" style={{ color: "var(--carbs)" }}>
                  {Math.round(avg.carbs / n)}g
                </div>
                <div className="l">carbs</div>
              </div>
              <div className="ws">
                <div className="v" style={{ color: "var(--fat)" }}>
                  {Math.round(avg.fat / n)}g
                </div>
                <div className="l">fat</div>
              </div>
            </div>
            <p className="hint">
              Daily averages across {logged.length} logged{" "}
              {logged.length === 1 ? "day" : "days"} this week. Target{" "}
              {targets.calories} kcal · {targets.protein}g protein.
            </p>
          </>
        ) : (
          <div className="empty">No days logged yet this week.</div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Daily history</h2>
        {keys.map((k) => {
          const day = state.days[k];
          const t = dayTotals(day);
          const hasData = day && day.foods.length > 0;
          const hit = day ? hitTargets(day, targets) : false;
          const calPct = Math.min(100, (t.calories / totalCalMax) * 100);
          // macro composition bar (protein/carbs/fat by kcal)
          const pC = t.protein * 4;
          const cC = t.carbs * 4;
          const fC = t.fat * 9;
          const totC = pC + cC + fC || 1;
          return (
            <div className="history-row" key={k}>
              <div className="h-date">
                {isToday(k) ? "Today" : formatShortDate(k).split(" ")[0]}
                <small>{formatShortDate(k).split(" ")[1]}</small>
              </div>
              <div className="h-bars">
                <div className="h-cal">
                  <span>
                    {hasData ? (
                      <>
                        <b>{Math.round(t.calories)}</b> / {targets.calories} kcal
                      </>
                    ) : (
                      <span style={{ color: "var(--faint)" }}>No log</span>
                    )}
                  </span>
                  {hasData && (
                    <span>
                      P{Math.round(t.protein)} C{Math.round(t.carbs)} F
                      {Math.round(t.fat)}
                    </span>
                  )}
                </div>
                {hasData && (
                  <div className="h-macro-line" style={{ opacity: 0.9 }}>
                    <i style={{ width: `${(pC / totC) * calPct}%`, background: "var(--protein)" }} />
                    <i style={{ width: `${(cC / totC) * calPct}%`, background: "var(--carbs)" }} />
                    <i style={{ width: `${(fC / totC) * calPct}%`, background: "var(--fat)" }} />
                  </div>
                )}
                {day?.bodyweight != null && (
                  <div className="hit-weight">⚖ {day.bodyweight} {unit}</div>
                )}
              </div>
              <div className={`hit-badge ${hit ? "hit-yes" : "hit-no"}`}>
                {hasData ? (hit ? "On target" : "Logged") : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
