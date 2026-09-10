import { NextResponse } from "next/server";
import {
  adminIsConfigured,
  changeAdminPassword,
  clearFailedLogins,
  clearSessionCookie,
  createAdminPassword,
  createSession,
  destroySession,
  loginRateLimited,
  registerFailedLogin,
  sessionCookie,
  sessionIsValid,
  verifyAdminPassword,
} from "@/app/lib/server";

export async function GET(request: Request) {
  const configured = await adminIsConfigured();
  const authenticated = configured ? await sessionIsValid(request) : false;
  return NextResponse.json({ configured, authenticated }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      password?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (body.action === "logout") {
      await destroySession(request);
      return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
    }

    if (body.action === "change") {
      if (!(await sessionIsValid(request))) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
      if (!body.currentPassword || !body.newPassword || body.newPassword.length < 6) {
        return NextResponse.json({ error: "Informe a senha atual e uma nova senha com pelo menos 6 caracteres." }, { status: 400 });
      }
      await changeAdminPassword(body.currentPassword, body.newPassword);
      return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
    }

    const password = body.password ?? "";
    if (password.length < 6) {
      return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
    }

    if (body.action === "setup") {
      await createAdminPassword(password);
    } else if (body.action === "login") {
      const identifier = request.headers.get("cf-connecting-ip") ?? "local";
      if (await loginRateLimited(identifier)) {
        return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });
      }
      if (!(await verifyAdminPassword(password))) {
        await registerFailedLogin(identifier);
        return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
      }
      await clearFailedLogins(identifier);
    } else {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    const session = await createSession();
    return NextResponse.json(
      { ok: true },
      { headers: { "Set-Cookie": sessionCookie(session.token, session.expiresAt), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível concluir.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
