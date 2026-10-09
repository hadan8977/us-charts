import { NextRequest, NextResponse } from "next/server";
import { fetchAlpacaBars } from "@/lib/alpaca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const symbol = sp.get("symbol") || "AAPL";
    const timeframe = sp.get("timeframe") || "1Day";
    const limit = Number(sp.get("limit") || "200");
    const feed = (sp.get("feed") as "iex" | "sip" | null) || "iex";
    const start = sp.get("start") || undefined;
    const end = sp.get("end") || undefined;

    const result = await fetchAlpacaBars({
      symbol,
      timeframe,
      limit: Number.isFinite(limit) ? limit : 200,
      feed: feed === "sip" ? "sip" : "iex",
      start,
      end,
    });

    return NextResponse.json({
      ...result,
      source: "alpaca" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Missing env") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
