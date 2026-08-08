import { describe, expect, it } from "vitest";
import { GENERATORS, SECTION_TYPES } from "../reports";
import { REPORT_DEFINITIONS, REPORT_DEFINITION_BY_KEY } from "../report-definitions";

describe("report definitions", () => {
  it("has a unique key per definition", () => {
    const keys = REPORT_DEFINITIONS.map((d) => d.report_key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(REPORT_DEFINITION_BY_KEY).length).toBe(keys.length);
  });

  it("gives every implemented generator exactly one definition", () => {
    for (const key of Object.keys(GENERATORS)) {
      const matches = REPORT_DEFINITIONS.filter((d) => d.report_key === key);
      expect(matches, `no definition for generator ${key}`).toHaveLength(1);
    }
  });

  it("marks a definition active only when a generator exists", () => {
    for (const d of REPORT_DEFINITIONS) {
      if (d.active) expect(GENERATORS[d.report_key], `${d.report_key} is active`).toBeTruthy();
    }
  });

  it("validates every section type against SECTION_TYPES", () => {
    const allowed = new Set<string>(SECTION_TYPES);
    for (const d of REPORT_DEFINITIONS) {
      expect(d.sections.length, `${d.report_key} has no sections`).toBeGreaterThan(0);
      for (const s of d.sections) {
        expect(allowed.has(s.type), `${d.report_key}: bad section type ${s.type}`).toBe(true);
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(typeof s.config).toBe("object");
      }
    }
  });

  it("accepts transcript as a section type (defect D-03)", () => {
    expect(SECTION_TYPES).toContain("transcript");
    const card = REPORT_DEFINITION_BY_KEY["DEVELOPMENT_CONTROL_REPORT_CARD"];
    expect(card?.sections.some((s) => s.type === "transcript")).toBe(true);
  });

  it("states an audience, a decision and at least one applicable stage", () => {
    for (const d of REPORT_DEFINITIONS) {
      expect(d.audience.trim().length, `${d.report_key} audience`).toBeGreaterThan(0);
      expect(d.decision.trim().length, `${d.report_key} decision`).toBeGreaterThan(0);
      expect(d.applicable_stages.length, `${d.report_key} stages`).toBeGreaterThan(0);
      for (const s of d.applicable_stages) expect(s).toBeGreaterThanOrEqual(1);
      for (const s of d.applicable_stages) expect(s).toBeLessThanOrEqual(9);
    }
  });
});
