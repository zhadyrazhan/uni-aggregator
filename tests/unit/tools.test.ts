import { describe, expect, it } from "vitest";
import { executeTool, TOOLS_SCHEMA } from "@/lib/ai/tools";

describe("TOOLS_SCHEMA", () => {
  it("declares at least 3 tools with valid function schemas", () => {
    expect(TOOLS_SCHEMA.length).toBeGreaterThanOrEqual(3);
    for (const tool of TOOLS_SCHEMA) {
      expect(tool.type).toBe("function");
      if (tool.type !== "function") continue;
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.parameters).toBeTruthy();
    }
  });
});

describe("executeTool", () => {
  it("list_universities returns catalog rows as text", async () => {
    const result = await executeTool("list_universities", { country: "Kazakhstan" });
    expect(result).toContain("Kazakhstan");
  });

  it("get_university_details returns a not-found message for unknown names", async () => {
    const result = await executeTool("get_university_details", { name: "Not A Real School" });
    expect(result.toLowerCase()).toContain("no university found");
  });

  it("get_university_details fuzzy-matches a partial name", async () => {
    const result = await executeTool("get_university_details", { name: "Institute of Technology" });
    expect(result).toContain("Massachusetts Institute of Technology");
  });

  it("get_admission_requirements returns exam info", async () => {
    const result = await executeTool("get_admission_requirements", { name: "Nazarbayev University" });
    expect(result).toContain("Required exams");
  });

  it("recommend_universities honors a tuition ceiling", async () => {
    const result = await executeTool("recommend_universities", { maxTuitionUsd: 3000 });
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("Massachusetts Institute of Technology");
  });

  it("returns a graceful message for missing required arguments", async () => {
    const result = await executeTool("get_university_details", {});
    expect(result).toContain("Missing required argument");
  });

  it("returns a graceful message for an unknown tool name", async () => {
    const result = await executeTool("delete_everything", {});
    expect(result).toContain("Unknown tool");
  });
});
