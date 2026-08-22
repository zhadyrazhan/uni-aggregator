import { NextResponse } from "next/server";
import { getUniversityById } from "@/lib/universities";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const university = await getUniversityById(id);

  if (!university) {
    return NextResponse.json({ error: "University not found" }, { status: 404 });
  }

  return NextResponse.json({ university });
}
