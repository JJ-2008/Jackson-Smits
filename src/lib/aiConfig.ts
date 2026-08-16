/**
 * AI configuration, stored separately from the main app state so the API key
 * is NEVER included in exported backups.
 *
 * Uses Google Gemini, which has a genuinely free tier — no credit card, no
 * business/ABN, no charge. Users get a free key from Google AI Studio.
 */
export interface AIConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export const AI_MODELS: { id: string; label: string; note?: string }[] = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", note: "Reliable & free — recommended" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Newer & smarter (if your key supports it)" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Fastest & lightest" },
];

const DEFAULT_MODEL = "gemini-2.0-flash";
const KEY = "cutting-tracker:ai";

/** Old builds stored a Claude model id here — fall back to a valid Gemini one. */
function normaliseModel(m: unknown): string {
  return typeof m === "string" && m.startsWith("gemini") ? m : DEFAULT_MODEL;
}

export function loadAIConfig(): AIConfig {
  if (typeof localStorage === "undefined")
    return { apiKey: "", model: DEFAULT_MODEL, enabled: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { apiKey: "", model: DEFAULT_MODEL, enabled: false };
    const p = JSON.parse(raw) as Partial<AIConfig>;
    return {
      apiKey: p.apiKey ?? "",
      model: normaliseModel(p.model),
      enabled: p.enabled ?? false,
    };
  } catch {
    return { apiKey: "", model: DEFAULT_MODEL, enabled: false };
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

/** A remembered rate-limit cooldown, so the timer survives app restarts. */
export interface AICooldown {
  until: number; // epoch ms the limit resets
  daily: boolean; // true = daily quota (long wait), false = per-minute
}

const CD_KEY = "cutting-tracker:ai-cooldown";

export function loadCooldown(): AICooldown {
  if (typeof localStorage === "undefined") return { until: 0, daily: false };
  try {
    const raw = localStorage.getItem(CD_KEY);
    if (!raw) return { until: 0, daily: false };
    const p = JSON.parse(raw) as Partial<AICooldown>;
    const until = typeof p.until === "number" ? p.until : 0;
    // Ignore a cooldown that's already elapsed.
    return until > Date.now() ? { until, daily: !!p.daily } : { until: 0, daily: false };
  } catch {
    return { until: 0, daily: false };
  }
}

export function saveCooldown(cd: AICooldown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CD_KEY, JSON.stringify(cd));
  } catch {
    /* ignore */
  }
}
