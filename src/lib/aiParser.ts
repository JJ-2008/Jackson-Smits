/**
 * AI food parser powered by Google Gemini (bring-your-own free key).
 *
 * Gemini has a genuinely free tier — no credit card and no business/ABN needed.
 * The user pastes their own key in Settings; it is stored only on their device
 * (see aiConfig.ts) and is never included in exported backups. Requests go
 * straight from the phone to Google — nothing is sent to any server we run.
 */
import type { Macros } from "../types";

export interface AIFood extends Macros {
  name: string;
  quantity: string;
}

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are a precise nutrition estimator for a calorie/macro tracking app.
Turn the user's plain-language description of what they ate or drank into a list of
individual items with realistic macros, the way a knowledgeable dietitian would.

Core rules:
- Log EXACTLY what is described. Honour specific parts and states, don't round up to
  the whole food: "egg yolk" is NOT a whole egg, "egg white" is NOT a whole egg,
  "chicken breast" is not thigh, and respect "skinless", "lean", "no dressing", and
  raw vs cooked/fried/grilled/roasted.
- Split a description into separate items ("a wrap and a latte" = 2 items).
- Use the amount the user states (grams, ml, slices, "two", "large"); otherwise
  estimate a normal real-world serving.
- "quantity" is short and human, e.g. "1 yolk", "200 g", "330 ml", "2 slices".
- Calories in kcal; protein/carbs/fat in grams. Numbers MUST be self-consistent:
  calories must equal about protein*4 + carbs*4 + fat*9.
- Keep estimates realistic, not inflated. Anchor meats to these cooked per-100g values:
  lamb shoulder ~290 kcal (24P/21F), chicken breast ~165 (31P/3.6F),
  beef mince ~250 (26P/15F), salmon ~200 (25P/12F), pork ~240 (27P/14F).
- If the text contains no real food or drink, return an empty items array.

Examples:
- "one raw egg yolk" -> {"items":[{"name":"Egg yolk","quantity":"1 yolk","calories":55,"protein":2.7,"carbs":0.6,"fat":4.5}]}
- "300g lamb shoulder" -> {"items":[{"name":"Lamb shoulder","quantity":"300 g","calories":870,"protein":72,"carbs":0,"fat":63}]}

Respond with ONLY a JSON object in exactly this shape:
{"items":[{"name":"Chicken caesar wrap","quantity":"1 wrap","calories":430,"protein":28,"carbs":38,"fat":18}]}`;

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: {
      "@type"?: string;
      retryDelay?: string;
      violations?: { quotaId?: string; quotaMetric?: string }[];
    }[];
  };
}

/** How many seconds until a per-minute free limit resets, from a 429 response. */
export function parseRetrySeconds(res: Response, err: GeminiResponse | null): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const s = parseInt(header, 10);
    if (Number.isFinite(s) && s > 0) return s;
  }
  for (const d of err?.error?.details ?? []) {
    if (typeof d.retryDelay === "string") {
      const m = d.retryDelay.match(/([\d.]+)/);
      if (m) {
        const s = Math.ceil(parseFloat(m[1]));
        if (s > 0) return s;
      }
    }
  }
  return 60; // sensible default: the per-minute free quota resets each minute
}

/** True when a 429 is the daily quota (vs the per-minute rate limit). */
export function isDailyQuota(err: GeminiResponse | null): boolean {
  for (const d of err?.error?.details ?? []) {
    for (const v of d.violations ?? []) {
      if (/per\s*day/i.test(`${v.quotaId ?? ""} ${v.quotaMetric ?? ""}`)) return true;
    }
  }
  return /per day|daily/i.test(err?.error?.message ?? "");
}

/** Seconds until the Gemini free daily quota resets (midnight US Pacific). */
export function secondsUntilPacificMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  let h = get("hour");
  if (h >= 24) h -= 24; // some environments render midnight as 24
  const elapsed = h * 3600 + get("minute") * 60 + get("second");
  return Math.max(60, 86400 - elapsed);
}

/** Work out how long to wait after a 429, and whether it's the daily cap. */
export function rateLimitInfo(
  res: Response,
  err: GeminiResponse | null
): { retryAfter: number; daily: boolean } {
  if (isDailyQuota(err)) return { retryAfter: secondsUntilPacificMidnight(), daily: true };
  return { retryAfter: parseRetrySeconds(res, err), daily: false };
}

/** Pull the first JSON object out of a model response, tolerating stray prose/fences. */
export function extractFoods(raw: string): AIFood[] {
  if (!raw) return [];
  let text = raw.trim();
  // Strip ```json … ``` / ``` … ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    // Fall back to the first {...} or [...] span in the text.
    const span = text.match(/[[{][\s\S]*[\]}]/);
    if (!span) return [];
    try {
      obj = JSON.parse(span[0]);
    } catch {
      return [];
    }
  }

  const arr = Array.isArray(obj)
    ? obj
    : Array.isArray((obj as { items?: unknown }).items)
      ? (obj as { items: unknown[] }).items
      : [];

  const foods: AIFood[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    const protein = num(o.protein);
    const carbs = num(o.carbs);
    const fat = num(o.fat);
    foods.push({
      name,
      quantity:
        typeof o.quantity === "string" && o.quantity.trim()
          ? o.quantity.trim()
          : "1 serving",
      calories: reconcileCalories(num(o.calories), protein, carbs, fat),
      protein,
      carbs,
      fat,
    });
  }
  return foods;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

/**
 * Keep the calorie figure consistent with the macros. If the model's calories
 * disagree with protein*4 + carbs*4 + fat*9 by more than ~12%, trust the macros
 * (fixes cases like "300g lamb = 1100 kcal" when the macros only sum to ~855).
 * Drinks with no macros keep whatever calories were given.
 */
function reconcileCalories(calories: number, protein: number, carbs: number, fat: number): number {
  const derived = protein * 4 + carbs * 4 + fat * 9;
  if (derived <= 0) return calories;
  if (calories <= 0 || Math.abs(calories - derived) / derived > 0.12) {
    return Math.round(derived);
  }
  return calories;
}

export class AIError extends Error {}

/** Thrown when the free tier is temporarily rate-limited. */
export class AIRateLimitError extends AIError {
  retryAfter: number; // seconds until the limit resets
  daily: boolean; // true = daily quota (long wait), false = per-minute
  constructor(message: string, retryAfter: number, daily = false) {
    super(message);
    this.retryAfter = retryAfter;
    this.daily = daily;
  }
}

export interface AIModelInfo {
  id: string;
  label: string;
}

/**
 * Ask Google which models this key can actually use for generateContent.
 * Model availability varies by key/region and changes over time, so detecting
 * beats hard-coding names. Returns free/fast Gemini text models, flash first.
 */
export async function listChatModels(apiKey: string): Promise<AIModelInfo[]> {
  if (!apiKey) throw new AIError("Add your free Google API key first.");

  let res: Response;
  try {
    res = await fetch(`${BASE}?key=${encodeURIComponent(apiKey)}&pageSize=200`, {
      method: "GET",
    });
  } catch {
    throw new AIError("Couldn't reach Google — check your internet connection.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = (await res.json()) as GeminiResponse;
      detail = err.error?.message || "";
    } catch {
      /* ignore */
    }
    if (res.status === 400 || res.status === 403)
      throw new AIError("That API key was rejected. Double-check it and try again.");
    throw new AIError(detail || `Couldn't load models (${res.status}).`);
  }

  const data = (await res.json()) as {
    models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[];
  };

  const out: AIModelInfo[] = [];
  for (const m of data.models ?? []) {
    const id = (m.name ?? "").replace(/^models\//, "");
    if (!id.startsWith("gemini")) continue;
    if (!(m.supportedGenerationMethods ?? []).includes("generateContent")) continue;
    // Skip non–text-chat variants.
    if (/embedding|aqa|image|imagen|vision|tts|audio|live/i.test(id)) continue;
    out.push({ id, label: m.displayName || id });
  }

  const rank = (id: string) =>
    id.includes("flash-lite") ? 0 : id.includes("flash") ? 1 : id.includes("pro") ? 2 : 3;
  out.sort((a, b) => rank(a.id) - rank(b.id));
  return out;
}

/**
 * Ask Gemini to turn a natural-language meal description into food items.
 * Throws an AIError with a friendly message on failure.
 */
export async function parseFoodWithAI(
  text: string,
  model: string,
  apiKey: string
): Promise<AIFood[]> {
  if (!apiKey) throw new AIError("Add your free Google API key in Settings first.");

  const url = `${BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AIError("Couldn't reach the AI — check your internet connection.");
  }

  if (!res.ok) {
    let err: GeminiResponse | null = null;
    try {
      err = (await res.json()) as GeminiResponse;
    } catch {
      /* ignore */
    }
    const detail = err?.error?.message || "";
    if (res.status === 400 && /api.?key/i.test(detail))
      throw new AIError("Your Google API key was rejected. Check it in Settings.");
    if (res.status === 400)
      throw new AIError(detail || "The AI rejected that request.");
    if (res.status === 403)
      throw new AIError("That key can't access this model. Check it in Settings.");
    if (res.status === 404)
      throw new AIError("That AI model isn't available — pick a different one in Settings.");
    if (res.status === 429) {
      const info = rateLimitInfo(res, err);
      throw new AIRateLimitError(
        info.daily
          ? "Daily free AI limit reached — logging with the built-in estimator until it resets."
          : "Free AI limit reached — logging with the built-in estimator meanwhile.",
        info.retryAfter,
        info.daily
      );
    }
    throw new AIError(detail || `AI request failed (${res.status}).`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason)
    throw new AIError("The AI blocked that description. Try rewording it.");

  const raw = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("\n");

  return extractFoods(raw);
}
