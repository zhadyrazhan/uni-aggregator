import { NextResponse } from "next/server";
import { listCountriesAndMajors } from "@/lib/universities";

export async function GET() {
  const meta = await listCountriesAndMajors();
  return NextResponse.json(meta);
}
