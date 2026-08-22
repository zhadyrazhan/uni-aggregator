import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type UniversitySummary = Awaited<ReturnType<typeof listUniversities>>[number];
export type UniversityDetail = NonNullable<Awaited<ReturnType<typeof getUniversityByName>>>;

const summaryInclude = {
  majors: { select: { name: true } },
} satisfies Prisma.UniversityInclude;

const detailInclude = {
  majors: { select: { name: true } },
  requirement: true,
} satisfies Prisma.UniversityInclude;

export type ListUniversitiesFilters = {
  country?: string;
  major?: string;
  search?: string;
  limit?: number;
};

export async function listUniversities(filters: ListUniversitiesFilters = {}) {
  const { country, major, search, limit = 50 } = filters;

  // Note: SQLite has no `mode: "insensitive"` filter (Postgres/Mongo only). We use `contains`
  // for country/major too (not just `equals`) so casing from free-text AI input still matches —
  // SQL LIKE is already case-insensitive for ASCII text on SQLite by default.
  const where: Prisma.UniversityWhereInput = {
    ...(country ? { country: { contains: country } } : {}),
    ...(major ? { majors: { some: { name: { contains: major } } } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { city: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const universities = await db.university.findMany({
    where,
    include: summaryInclude,
    orderBy: { rankingScore: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  return universities.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    city: u.city,
    tuitionUsd: u.tuitionUsd,
    rankingScore: u.rankingScore,
    description: u.description,
    majors: u.majors.map((m) => m.name),
  }));
}

export async function getUniversityById(id: string) {
  const u = await db.university.findUnique({ where: { id }, include: detailInclude });
  if (!u) return null;
  return formatDetail(u);
}

export async function getUniversityByName(name: string) {
  // `name` is unique (see prisma/schema.prisma) — findUnique both makes duplicate-name
  // ambiguity impossible at the DB level and lets Prisma use the unique index directly.
  const u = await db.university.findUnique({
    where: { name },
    include: detailInclude,
  });
  if (!u) return null;
  return formatDetail(u);
}

/** Fuzzy lookup used by the AI tools, where the model may pass a partial/approximate name. */
export async function findUniversityByApproximateName(name: string) {
  const exact = await getUniversityByName(name);
  if (exact) return exact;

  // Unlike the exact lookup above, `contains` can genuinely match multiple universities (e.g.
  // "Technical University" matches both "Technical University of Munich" and a hypothetical
  // "Munich Technical University") — findFirst is intentional here, not a bug. orderBy makes
  // which one wins deterministic and picks the most prominent match by ranking.
  const u = await db.university.findFirst({
    where: { name: { contains: name } },
    include: detailInclude,
    orderBy: { rankingScore: "desc" },
  });
  if (!u) return null;
  return formatDetail(u);
}

export async function listCountriesAndMajors() {
  const [countries, majors] = await Promise.all([
    db.university.findMany({ select: { country: true }, distinct: ["country"], orderBy: { country: "asc" } }),
    db.major.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    countries: countries.map((c) => c.country),
    majors: majors.map((m) => m.name),
  };
}

function formatDetail(
  u: Prisma.UniversityGetPayload<{ include: typeof detailInclude }>
) {
  return {
    id: u.id,
    name: u.name,
    country: u.country,
    city: u.city,
    foundedYear: u.foundedYear,
    tuitionUsd: u.tuitionUsd,
    rankingScore: u.rankingScore,
    description: u.description,
    website: u.website,
    majors: u.majors.map((m) => m.name),
    requirement: u.requirement
      ? {
          requiredExams: u.requirement.requiredExams,
          minExamScore: u.requirement.minExamScore,
          minGpa: u.requirement.minGpa,
          notes: u.requirement.notes,
        }
      : null,
  };
}

export async function recommendUniversities(criteria: {
  major?: string;
  country?: string;
  maxTuitionUsd?: number;
  limit?: number;
}) {
  const { major, country, maxTuitionUsd, limit = 5 } = criteria;

  const where: Prisma.UniversityWhereInput = {
    ...(major ? { majors: { some: { name: { contains: major } } } } : {}),
    ...(country ? { country: { contains: country } } : {}),
    ...(typeof maxTuitionUsd === "number" ? { tuitionUsd: { lte: maxTuitionUsd } } : {}),
  };

  const universities = await db.university.findMany({
    where,
    include: summaryInclude,
    orderBy: [{ rankingScore: "desc" }],
    take: Math.min(Math.max(limit, 1), 10),
  });

  return universities.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    city: u.city,
    tuitionUsd: u.tuitionUsd,
    rankingScore: u.rankingScore,
    majors: u.majors.map((m) => m.name),
  }));
}
