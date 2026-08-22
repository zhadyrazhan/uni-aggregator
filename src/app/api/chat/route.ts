import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai/agent";

const SESSION_COOKIE = "uni_chat_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const existingSessionId = getCookie(request, SESSION_COOKIE);

  try {
    const { sessionId, reply } = await runAgent(existingSessionId, message);

    const res = NextResponse.json({ reply });
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match?.split("=")[1];
}
