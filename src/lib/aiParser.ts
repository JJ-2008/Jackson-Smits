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
The user describes, in plain everyday language, what they ate or drank. Your job is to
turn that description into a list of individual food/drink items with realistic macro
estimates, the way a knowledgeable dietitian would.

Rules:
- Split a description into separate items (e.g. "a chicken caesar wrap and a latte" = 2 items).
- Estimate a sensible real-world portion when none is given (a typical serving), and honour
  any amount the user states (grams, cups, slices, "large", "two", etc.).
- "quantity" is a short human-readable amount, e.g. "200 g", "1 wrap", "330 ml", "2 slices".
- calories in kcal; protein, carbs, fat in grams. Keep calories roughly consistent with
  4/4/9 kcal per gram of protein/carbs/fat.
- Be reasonable about restaurant/takeaway/branded items (McDonald's, Nando's, Pret, etc.).
- If the text contains no actual food or drink, return an empty items array.

Respond with ONLY a JSON object in exactly this shape:
{"items":[{"name":"Chicken caesar wrap","quantity":"1 wrap","calories":430,"protein":28,"carbs":38,"fat":18}]}`;

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
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
    foods.push({
      name,
      quantity:
        typeof o.quantity === "string" && o.quantity.trim()
          ? o.quantity.trim()
          : "1 serving",
      calories: num(o.calories),
      protein: num(o.protein),
      carbs: num(o.carbs),
      fat: num(o.fat),
    });
  }
  return foods;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

export class AIError extends Error {}

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
    let detail = "";
    try {
      const err = (await res.json()) as GeminiResponse;
      detail = err.error?.message || "";
    } catch {
      /* ignore */
    }
    if (res.status === 400 && /api.?key/i.test(detail))
      throw new AIError("Your Google API key was rejected. Check it in Settings.");
    if (res.status === 400)
      throw new AIError(detail || "The AI rejected that request.");
    if (res.status === 403)
      throw new AIError("That key can't access this model. Check it in Settings.");
    if (res.status === 404)
      throw new AIError("That AI model isn't available — pick a different one in Settings.");
    if (res.status === 429)
      throw new AIError("Free AI limit reached for now — try again in a minute.");
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
