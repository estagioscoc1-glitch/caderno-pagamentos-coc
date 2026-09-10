import { NextResponse } from "next/server";
import { getBookState, saveBookState, sessionIsValid } from "@/app/lib/server";
import { PAYMENT_COLUMNS, type BookState } from "@/app/lib/seed-data";

function validState(value: unknown): value is BookState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<BookState>;
  if (
    state.version !== 1 ||
    !Array.isArray(state.students) ||
    state.students.length > 2000 ||
    typeof state.messageTemplate !== "string" ||
    state.messageTemplate.length > 3000 ||
    !Array.isArray(state.messageHistory) ||
    state.messageHistory.length > 50000
  ) return false;
  const ids = new Set(PAYMENT_COLUMNS.map((column) => column.id));
  return state.students.every((student) => {
    if (!student || typeof student !== "object") return false;
    const candidate = student as BookState["students"][number];
    return (
      typeof candidate.id === "string" &&
      typeof candidate.registration === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.className === "string" &&
      (candidate.situation === "active" || candidate.situation === "withdrawn") &&
      candidate.payments &&
      [...ids].every((id) => candidate.payments[id] === "paid" || candidate.payments[id] === "pending")
    );
  });
}

export async function GET(request: Request) {
  if (!(await sessionIsValid(request))) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  return NextResponse.json(await getBookState(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!(await sessionIsValid(request))) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const state = (await request.json()) as unknown;
  if (!validState(state)) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  return NextResponse.json(await saveBookState(state));
}
