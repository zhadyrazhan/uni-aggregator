import { describe, expect, it } from "vitest";
import {
  findUniversityByApproximateName,
  getUniversityByName,
  listCountriesAndMajors,
  listUniversities,
  recommendUniversities,
} from "@/lib/universities";

describe("listUniversities", () => {
  it("returns the full seeded catalog with no filters", async () => {
    const results = await listUniversities();
    expect(results.length).toBeGreaterThanOrEqual(15);
  });

  it("filters by country", async () => {
    const results = await listUniversities({ country: "Kazakhstan" });
    expect(results.length).toBeGreaterThan(0);
    for (const u of results) expect(u.country).toBe("Kazakhstan");
  });

  it("filters by major", async () => {
    const results = await listUniversities({ major: "Computer Science" });
    expect(results.length).toBeGreaterThan(0);
    for (const u of results) expect(u.majors).toContain("Computer Science");
  });

  it("respects the limit", async () => {
    const results = await listUniversities({ limit: 3 });
    expect(results.length).toBe(3);
  });
});

describe("getUniversityByName / findUniversityByApproximateName", () => {
  it("finds an exact match with full detail", async () => {
    const u = await getUniversityByName("Nazarbayev University");
    expect(u).not.toBeNull();
    expect(u?.requirement).not.toBeNull();
    expect(u?.majors.length).toBeGreaterThan(0);
  });

  it("falls back to a fuzzy match for partial names", async () => {
    const u = await findUniversityByApproximateName("Nazarbayev");
    expect(u?.name).toBe("Nazarbayev University");
  });

  it("returns null for a university that doesn't exist", async () => {
    const u = await findUniversityByApproximateName("Definitely Not A Real University");
    expect(u).toBeNull();
  });
});

describe("recommendUniversities", () => {
  it("respects a tuition ceiling", async () => {
    const results = await recommendUniversities({ maxTuitionUsd: 3000 });
    expect(results.length).toBeGreaterThan(0);
    for (const u of results) expect(u.tuitionUsd ?? 0).toBeLessThanOrEqual(3000);
  });

  it("combines major and country criteria", async () => {
    const results = await recommendUniversities({ major: "Computer Science", country: "Kazakhstan" });
    expect(results.length).toBeGreaterThan(0);
    for (const u of results) {
      expect(u.country).toBe("Kazakhstan");
      expect(u.majors).toContain("Computer Science");
    }
  });
});

describe("listCountriesAndMajors", () => {
  it("returns non-empty, deduplicated lists", async () => {
    const { countries, majors } = await listCountriesAndMajors();
    expect(new Set(countries).size).toBe(countries.length);
    expect(new Set(majors).size).toBe(majors.length);
    expect(countries).toContain("Kazakhstan");
  });
});
