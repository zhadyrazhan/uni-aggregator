import { NextResponse } from "next/server";
import { listUniversities } from "@/lib/universities";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const country = searchParams.get("country") ?? undefined;
  const major = searchParams.get("major") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const limitParam = searchParams.get("limit");

  const universities = await listUniversities({
    country,
    major,
    search,
    limit: limitParam ? Number(limitParam) : undefined,
  });

  return NextResponse.json({ universities });
}
