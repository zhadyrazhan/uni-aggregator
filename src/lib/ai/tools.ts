import type OpenAI from "openai";
import {
  findUniversityByApproximateName,
  listUniversities,
  recommendUniversities,
} from "@/lib/universities";

/**
 * The agent's tool belt. Every tool reads from the same Prisma-backed catalog the public
 * pages use (src/lib/universities.ts) — there is no separate/fake data source for the AI.
 */
export const TOOLS_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_universities",
      description:
        "List universities from the catalog, optionally filtered by country and/or major. Use this to browse or answer 'what universities are there in X'.",
      parameters: {
        type: "object",
        properties: {
          country: { type: "string", description: "Filter by country, e.g. 'Kazakhstan'" },
          major: { type: "string", description: "Filter by major/specialty, e.g. 'Computer Science'" },
          limit: { type: "number", description: "Max results to return (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_university_details",
      description:
        "Get full details for one specific university by name (description, majors, tuition, ranking, website). Call this once per university when the user asks about or compares specific universities.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The university's name, e.g. 'Nazarbayev University'" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_admission_requirements",
      description:
        "Get the admission requirements (required exams, minimum scores, GPA) for one specific university by name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The university's name" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_universities",
      description:
        "Recommend universities matching soft criteria: major, country, and/or a maximum yearly tuition in USD. Use this when the user asks to be helped choosing/picking a university rather than naming one directly.",
      parameters: {
        type: "object",
        properties: {
          major: { type: "string" },
          country: { type: "string" },
          maxTuitionUsd: { type: "number", description: "Maximum tuition per year in USD" },
        },
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "list_universities": {
        const results = await listUniversities({
          country: asString(args.country),
          major: asString(args.major),
          limit: asNumber(args.limit) ?? 10,
        });
        if (results.length === 0) return "No universities matched those filters.";
        return results
          .map(
            (u) =>
              `${u.name} — ${u.city}, ${u.country} | majors: ${u.majors.join(", ") || "n/a"} | tuition: ${
                u.tuitionUsd ? `$${u.tuitionUsd}/yr` : "n/a"
              } | ranking score: ${u.rankingScore ?? "n/a"}`
          )
          .join("\n");
      }

      case "get_university_details": {
        const name = asString(args.name);
        if (!name) return "Missing required argument: name";
        const u = await findUniversityByApproximateName(name);
        if (!u) return `No university found matching "${name}".`;
        return [
          `${u.name} (${u.city}, ${u.country}, founded ${u.foundedYear ?? "n/a"})`,
          u.description,
          `Majors: ${u.majors.join(", ") || "n/a"}`,
          `Tuition: ${u.tuitionUsd ? `$${u.tuitionUsd}/yr` : "n/a"}`,
          `Ranking score: ${u.rankingScore ?? "n/a"}`,
          u.website ? `Website: ${u.website}` : undefined,
        ]
          .filter(Boolean)
          .join("\n");
      }

      case "get_admission_requirements": {
        const name = asString(args.name);
        if (!name) return "Missing required argument: name";
        const u = await findUniversityByApproximateName(name);
        if (!u) return `No university found matching "${name}".`;
        if (!u.requirement) return `${u.name} has no admission requirements on file.`;
        return [
          `Admission requirements for ${u.name}:`,
          `Required exams: ${u.requirement.requiredExams}`,
          `Minimum score: ${u.requirement.minExamScore}`,
          u.requirement.minGpa ? `Minimum GPA: ${u.requirement.minGpa}` : undefined,
          u.requirement.notes ? `Notes: ${u.requirement.notes}` : undefined,
        ]
          .filter(Boolean)
          .join("\n");
      }

      case "recommend_universities": {
        const results = await recommendUniversities({
          major: asString(args.major),
          country: asString(args.country),
          maxTuitionUsd: asNumber(args.maxTuitionUsd),
        });
        if (results.length === 0) return "No universities matched those criteria.";
        return results
          .map(
            (u, i) =>
              `${i + 1}. ${u.name} — ${u.city}, ${u.country} | majors: ${u.majors.join(", ") || "n/a"} | tuition: ${
                u.tuitionUsd ? `$${u.tuitionUsd}/yr` : "n/a"
              } | ranking score: ${u.rankingScore ?? "n/a"}`
          )
          .join("\n");
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error running tool ${name}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
