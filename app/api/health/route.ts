import { NextResponse } from "next/server";
import { databaseIsHealthy } from "@/app/lib/server";
export async function GET() {
  const database = await databaseIsHealthy();
  return NextResponse.json({ status: database ? "ok" : "error", database, checkedAt: new Date().toISOString() }, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
