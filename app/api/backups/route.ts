import { NextResponse } from "next/server";
import { createManualBackup, listBookBackups, restoreBookBackup, sessionIsValid } from "@/app/lib/server";

export async function GET(request: Request) {
  if (!(await sessionIsValid(request))) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  return NextResponse.json({ backups: await listBookBackups() }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!(await sessionIsValid(request))) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const body = await request.json() as { action?: string; id?: number };
  if (body.action === "snapshot") { await createManualBackup(); return NextResponse.json({ ok: true }); }
  if (body.action === "restore" && Number.isInteger(body.id)) return NextResponse.json(await restoreBookBackup(body.id!));
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
