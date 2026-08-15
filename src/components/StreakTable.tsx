import type { AppState } from "../types";
import { streakSummary, type DayStatus } from "../lib/streak";
import { formatShortDate, isToday } from "../lib/date";

interface Props {
  state: AppState;
  today: string;
}

function dotClass(s: DayStatus): string {
  if (!s.logged) return "d-empty";
  if (s.perfect) return "d-perfect";
  if (s.hitGoals) return "d-goal";
  if (s.clean) return "d-clean";
  return "d-logged";
}

export function StreakTable({ state, today }: Props) {
  const sum = streakSummary(state, 14, today);

  return (
    <div className="card">
      <h2 className="section-title">Clean streak &amp; goals hit</h2>

      <div className="streak-stats">
        <div className="streak-stat">
          <div className="ss-num">🔥 {sum.cleanStreak}</div>
          <div className="ss-lab">Clean day streak</div>
        </div>
        <div className="streak-stat">
          <div className="ss-num">🎯 {sum.goalStreak}</div>
          <div className="ss-lab">Goals-hit streak</div>
        </div>
        <div className="streak-stat">
          <div className="ss-num">⭐ {sum.perfectStreak}</div>
          <div className="ss-lab">Perfect streak</div>
        </div>
      </div>

      <div className="streak-dots">
        {sum.statuses.map((s) => (
          <div className="dot-col" key={s.date}>
            <div className={`day-dot ${dotClass(s)}`}>
              {s.perfect ? "★" : s.logged ? (s.clean && s.hitGoals ? "" : "") : ""}
            </div>
          </div>
        ))}
      </div>

      <div className="streak-legend">
        <span><i className="lg d-perfect" /> Perfect</span>
        <span><i className="lg d-goal" /> Hit goals</span>
        <span><i className="lg d-clean" /> Clean only</span>
        <span><i className="lg d-logged" /> Logged</span>
        <span><i className="lg d-empty" /> None</span>
      </div>

      <div className="streak-table">
        <div className="st-head">
          <span className="st-date">Day</span>
          <span>Goals</span>
          <span>No junk</span>
          <span>Perfect</span>
        </div>
        {[...sum.statuses].reverse().map((s) => (
          <div className="st-row" key={s.date}>
            <span className="st-date">
              {isToday(s.date) ? "Today" : formatShortDate(s.date)}
            </span>
            <span>{!s.logged ? "—" : s.hitGoals ? "✅" : "❌"}</span>
            <span>{!s.logged ? "—" : s.clean ? "✅" : "🍫"}</span>
            <span>{!s.logged ? "—" : s.perfect ? "⭐" : "—"}</span>
          </div>
        ))}
      </div>

      <p className="hint">
        Over the last 14 days: <b>{sum.perfectDays}</b> perfect · <b>{sum.cleanDays}</b> junk-free
        · <b>{sum.goalDays}</b> on-target · <b>{sum.loggedDays}</b> logged. A day counts as
        “goals hit” when protein is met and calories land within 10% of target.
      </p>
    </div>
  );
}
