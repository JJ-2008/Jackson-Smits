/**
 * AI (Claude) configuration, stored separately from the main app state so the
 * API key is NEVER included in exported backups.
 */
export interface AIConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export const AI_MODELS: { id: string; label: string; note: string }[] = [
  { id: "claude-opus-5", label: "Claude Opus 5", note: "Smartest — best understanding" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", note: "Balanced speed and smarts" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", note: "Cheapest & fastest — great for daily logging" },
];

const KEY = "cutting-tracker:ai";

export function loadAIConfig(): AIConfig {
  if (typeof localStorage === "undefined") return { apiKey: "", model: "claude-opus-5", enabled: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { apiKey: "", model: "claude-opus-5", enabled: false };
    const p = JSON.parse(raw) as Partial<AIConfig>;
    return {
      apiKey: p.apiKey ?? "",
      model: p.model ?? "claude-opus-5",
      enabled: p.enabled ?? false,
    };
  } catch {
    return { apiKey: "", model: "claude-opus-5", enabled: false };
  }
}

export function saveAIConfig(cfg: AIConfig): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}
