import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase-2 stub: PineTS (pinets) runs best in a durable Node runtime with OHLCV
 * fed from /api/bars. Not wired for Vercel Edge; keep Node runtime when enabling.
 */
export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  return NextResponse.json(
    {
      ok: false,
      phase: 2,
      message:
        "Pine execution is stubbed for phase 1. Install pinets / @luxalgo/vela-pinets and run on Node runtime (not Edge). Feed bars from /api/bars.",
      received: body,
    },
    { status: 501 },
  );
}
