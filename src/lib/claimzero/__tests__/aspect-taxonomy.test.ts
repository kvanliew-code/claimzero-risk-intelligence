import { describe, expect, it } from "vitest";
import {
  ASPECTS_30,
  ASPECT_BY_ID,
  ASPECT_STREAMS,
  DELIVERY_SYSTEM_HEALTH_ASPECTS,
  LEGACY_ASPECT_MAP,
  aspectsInStream,
} from "../aspect-taxonomy";

describe("the thirty aspects", () => {
  it("has exactly 30 aspects", () => {
    expect(ASPECTS_30).toHaveLength(30);
  });

  it("numbers them uniquely and completely from 1 to 30", () => {
    const numbers = ASPECTS_30.map((x) => x.number).sort((p, q) => p - q);
    expect(numbers).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(new Set(numbers).size).toBe(30);
  });

  it("derives a unique padded id from the number", () => {
    for (const x of ASPECTS_30) {
      expect(x.aspect_id).toBe(`A${String(x.number).padStart(2, "0")}`);
    }
    expect(Object.keys(ASPECT_BY_ID)).toHaveLength(30);
  });

  it("gives every aspect exactly one stream", () => {
    for (const x of ASPECTS_30) {
      const hits = ASPECT_STREAMS.filter((s) => s === x.stream);
      expect(hits, `${x.aspect_id} stream`).toHaveLength(1);
    }
  });

  it("represents all six streams, five aspects each", () => {
    expect(ASPECT_STREAMS).toHaveLength(6);
    for (const s of ASPECT_STREAMS) {
      expect(aspectsInStream(s).length, `${s}`).toBe(5);
    }
  });

  it("names every aspect, non-empty and unique", () => {
    const names = ASPECTS_30.map((x) => x.aspect_name.trim());
    expect(names.every((n) => n.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(30);
  });

  it("keeps first_active_stage inside the nine stages", () => {
    for (const x of ASPECTS_30) {
      expect(x.first_active_stage).toBeGreaterThanOrEqual(1);
      expect(x.first_active_stage).toBeLessThanOrEqual(9);
    }
  });

  it("maps each legacy id to exactly one thirty-aspect id", () => {
    const legacy = ASPECTS_30.map((x) => x.legacy_aspect_id).filter(Boolean) as string[];
    expect(new Set(legacy).size).toBe(legacy.length);
    expect(Object.keys(LEGACY_ASPECT_MAP)).toHaveLength(legacy.length);
    for (const [old, next] of Object.entries(LEGACY_ASPECT_MAP)) {
      expect(old).not.toBe("");
      expect(ASPECT_BY_ID[next]).toBeTruthy();
    }
  });

  it("scopes Delivery System Health to the organisational three (26-28)", () => {
    expect(DELIVERY_SYSTEM_HEALTH_ASPECTS).toEqual(["A26", "A27", "A28"]);
    for (const id of DELIVERY_SYSTEM_HEALTH_ASPECTS) {
      expect(ASPECT_BY_ID[id]?.stream).toBe("Delivery System");
    }
  });

  /* Report-card category mapping is deliberately absent. The four categories
     named in §14.4 do not exist in this repository, and inventing them would
     break the no-guessing rule. See docs/SCHEMA_REQUESTS.md. */
});
