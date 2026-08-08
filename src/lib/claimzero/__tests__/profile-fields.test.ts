import { describe, expect, it } from "vitest";
import { PROFILE_FIELDS, PROFILE_FIELD_COUNT } from "../profile";

describe("intake profile fields", () => {
  it("derives the displayed count from the field configuration", () => {
    expect(PROFILE_FIELD_COUNT).toBe(PROFILE_FIELDS.length);
  });

  it("keys every field uniquely", () => {
    const keys = PROFILE_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives select and multiselect fields option sets", () => {
    for (const f of PROFILE_FIELDS) {
      if (f.kind === "select" || f.kind === "multiselect") {
        expect(f.options?.length, `${f.key} options`).toBeGreaterThan(0);
      }
    }
  });
});
