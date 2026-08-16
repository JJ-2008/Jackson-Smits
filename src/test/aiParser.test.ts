import { describe, it, expect } from "vitest";
import { extractFoods, parseRetrySeconds } from "../lib/aiParser";

describe("AI parser response extraction", () => {
  it("parses a clean JSON object with an items array", () => {
    const foods = extractFoods(
      '{"items":[{"name":"Chicken caesar wrap","quantity":"1 wrap","calories":430,"protein":28,"carbs":38,"fat":18}]}'
    );
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe("Chicken caesar wrap");
    expect(foods[0].quantity).toBe("1 wrap");
    expect(foods[0].calories).toBe(430);
    expect(foods[0].protein).toBe(28);
  });

  it("tolerates ```json fenced output", () => {
    const raw = "Sure!\n```json\n{\"items\":[{\"name\":\"Latte\",\"quantity\":\"1 cup\",\"calories\":120,\"protein\":8,\"carbs\":12,\"fat\":5}]}\n```";
    const foods = extractFoods(raw);
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe("Latte");
    expect(foods[0].calories).toBe(120);
  });

  it("accepts a bare array as well as an items wrapper", () => {
    const foods = extractFoods(
      '[{"name":"Banana","quantity":"1","calories":105,"protein":1.3,"carbs":27,"fat":0.4}]'
    );
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe("Banana");
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const raw =
      'Here is your meal: {"items":[{"name":"Toast","quantity":"2 slices","calories":150,"protein":5,"carbs":28,"fat":2}]} enjoy!';
    const foods = extractFoods(raw);
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe("Toast");
  });

  it("defaults missing quantity and clamps bad numbers to 0", () => {
    const foods = extractFoods(
      '{"items":[{"name":"Mystery","calories":"abc","protein":-4}]}'
    );
    expect(foods).toHaveLength(1);
    expect(foods[0].quantity).toBe("1 serving");
    expect(foods[0].calories).toBe(0);
    expect(foods[0].protein).toBe(0);
  });

  it("fixes calories that disagree with the macros (e.g. inflated lamb)", () => {
    const foods = extractFoods(
      '{"items":[{"name":"Lamb shoulder","quantity":"300 g","calories":1100,"protein":72,"carbs":0,"fat":63}]}'
    );
    // 72*4 + 63*9 = 855, so the 1100 should be pulled back to the macro total.
    expect(foods[0].calories).toBe(855);
  });

  it("keeps calories that already match the macros", () => {
    const foods = extractFoods(
      '{"items":[{"name":"Egg yolk","quantity":"1 yolk","calories":55,"protein":2.7,"carbs":0.6,"fat":4.5}]}'
    );
    expect(foods[0].calories).toBe(55);
  });

  it("leaves zero-macro drinks alone", () => {
    const foods = extractFoods(
      '{"items":[{"name":"Black coffee","quantity":"1 cup","calories":2,"protein":0,"carbs":0,"fat":0}]}'
    );
    expect(foods[0].calories).toBe(2);
  });

  it("drops items without a name and returns [] for empty/garbage input", () => {
    expect(extractFoods('{"items":[{"quantity":"1"}]}')).toHaveLength(0);
    expect(extractFoods("")).toHaveLength(0);
    expect(extractFoods("no json here at all")).toHaveLength(0);
    expect(extractFoods('{"items":[]}')).toHaveLength(0);
  });
});

describe("rate-limit retry timing", () => {
  it("reads retryDelay from the error body", () => {
    const res = new Response("", { status: 429 });
    const secs = parseRetrySeconds(res, {
      error: {
        details: [
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "34s" },
        ],
      },
    });
    expect(secs).toBe(34);
  });

  it("prefers the Retry-After header when present", () => {
    const res = new Response("", { status: 429, headers: { "retry-after": "20" } });
    expect(parseRetrySeconds(res, null)).toBe(20);
  });

  it("falls back to 60 seconds when nothing is provided", () => {
    expect(parseRetrySeconds(new Response("", { status: 429 }), null)).toBe(60);
  });
});
