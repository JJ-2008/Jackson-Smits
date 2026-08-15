import type { AppState } from "../types";
import { DEFAULT_SETTINGS } from "./storage";

interface BackupFile {
  app: "cutting-tracker";
  version: 1;
  exportedAt: string;
  state: AppState;
}

/** Serialise the whole app state to a downloadable JSON backup. */
export function exportBackup(state: AppState): void {
  const payload: BackupFile = {
    app: "cutting-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cut-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Parse and validate a backup file's text into an AppState. */
export function parseBackup(text: string): AppState {
  const data = JSON.parse(text);
  const state: unknown = data?.state ?? data; // accept raw state too
  if (!state || typeof state !== "object" || !("days" in (state as object))) {
    throw new Error("This doesn't look like a Cut backup file.");
  }
  const s = state as Partial<AppState>;
  return {
    days: s.days ?? {},
    settings: {
      ...DEFAULT_SETTINGS,
      ...s.settings,
      targets: { ...DEFAULT_SETTINGS.targets, ...s.settings?.targets },
      mealTimes: { ...DEFAULT_SETTINGS.mealTimes, ...s.settings?.mealTimes },
    },
  };
}

/** Read a File (from an <input type=file>) as text. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}
