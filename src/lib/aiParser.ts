/**
 * Claude-powered food parser (bring-your-own-key).
 *
 * Calls the Anthropic Messages API directly from the browser. The user pastes
 * their own API key in Settings; it is stored only on their device (see
 * aiConfig.ts) and is never included in exported backups. Requests go straight
 * from the phone to api.anthropic.com — nothing is sent to any server we run.
 */
import type { Macros } from "../types";

export interface AIFood extends Macros {
  name: string;
  quantity: string;
}

const ENDPOINT = "https://api.anthropic.com/v1/messages";

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

Respond with ONLY a JSON object, no prose, no code fences, in exactly this shape:
{"items":[{"name":"Chicken caesar wrap","quantity":"1 wrap","calories":430,"protein":28,"carbs":38,"fat":18}]}`;

/** True for models that reject the output_config.effort parameter (Haiku). */
function supportsEffort(model: string): boolean {
  return !model.startsWith("claude-haiku");
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}
interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  stop_reason?: string;
  error?: { type?: string; message?: string };
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
 * Ask Claude to turn a natural-language meal description into food items.
 * Throws an AIError with a friendly message on failure.
 */
export async function parseFoodWithAI(
  text: string,
  model: string,
  apiKey: string
): Promise<AIFood[]> {
  if (!apiKey) throw new AIError("Add your Claude API key in Settings first.");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  };
  if (supportsEffort(model)) {
    body.output_config = { effort: "low" };
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AIError("Couldn't reach Claude — check your internet connection.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = (await res.json()) as AnthropicResponse;
      detail = err.error?.message || "";
    } catch {
      /* ignore */
    }
    if (res.status === 401)
      throw new AIError("Your Claude API key was rejected. Check it in Settings.");
    if (res.status === 429)
      throw new AIError("Claude is rate-limited or out of credit. Try again shortly.");
    if (res.status === 400 && /credit balance/i.test(detail))
      throw new AIError("Your Anthropic account is out of credit.");
    throw new AIError(detail || `Claude request failed (${res.status}).`);
  }

  const data = (await res.json()) as AnthropicResponse;
  if (data.stop_reason === "refusal")
    throw new AIError("Claude couldn't process that description. Try rewording it.");

  const raw = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");

  return extractFoods(raw);
}
