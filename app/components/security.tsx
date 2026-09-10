"use client";

import { LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Security({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (newPassword.length < 6) return setError("A nova senha precisa ter ao menos 6 caracteres.");
    if (newPassword !== confirm) return setError("As novas senhas não são iguais.");
    setBusy(true);
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "change", currentPassword, newPassword }) });
    const result = (await response.json()) as { error?: string }; setBusy(false);
    if (!response.ok) return setError(result.error || "Não foi possível alterar a senha.");
    setMessage("Senha alterada. Entre novamente com a nova senha."); setTimeout(onPasswordChanged, 900);
  }
  return <div className="view-stack"><section className="page-title-row"><div><span className="eyebrow">SEGURANÇA</span><h1>Senha administrativa</h1><p>Altere a senha de acesso ao caderno sempre que necessário.</p></div></section><section className="panel security-panel"><div className="security-illustration"><ShieldCheck /><h2>Acesso protegido</h2><p>A sessão termina automaticamente. Em computador compartilhado, use sempre o botão Sair.</p></div><form onSubmit={submit}><Label>Senha atual</Label><Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Label>Nova senha</Label><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><Label>Confirmar nova senha</Label><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}<Button type="submit" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <LockKeyhole />} Alterar senha</Button></form></section></div>;
}
