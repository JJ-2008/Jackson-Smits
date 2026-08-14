export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export function formatLongDate(key: string): string {
  const d = fromDateKey(key);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(key: string): string {
  const d = fromDateKey(key);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export function isToday(key: string): boolean {
  return key === toDateKey(new Date());
}

/** Last `n` day keys ending today (oldest first). */
export function recentDayKeys(n: number, end: string = toDateKey()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(addDays(end, -i));
  return keys;
}
