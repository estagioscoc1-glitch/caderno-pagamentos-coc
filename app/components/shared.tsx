"use client";

import { CheckCircle2, Clock3, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLASS_ORDER, type PaymentStatus, type Student } from "@/app/lib/seed-data";

export const number = new Intl.NumberFormat("pt-BR");

export function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function classList(students: Student[]) {
  const existing = new Set(students.map((student) => student.className));
  return [
    ...CLASS_ORDER.filter((className) => existing.has(className)),
    ...[...existing].filter((className) => !CLASS_ORDER.includes(className as (typeof CLASS_ORDER)[number])).sort(),
  ];
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark"><span>COC</span></div>
      {!compact && <div><strong>Caderno de Pagamentos</strong><small>Colégio Oswaldo Cruz</small></div>}
    </div>
  );
}

export function PaymentSelect({ value, onChange, disabled }: { value: PaymentStatus; onChange: (value: PaymentStatus) => void; disabled?: boolean }) {
  return (
    <select className={`payment-select ${value}`} value={value} onChange={(event) => onChange(event.target.value as PaymentStatus)} disabled={disabled}>
      <option value="pending">Pendente</option>
      <option value="paid">Pago</option>
    </select>
  );
}

export function SituationBadge({ student }: { student: Student }) {
  return student.situation === "withdrawn"
    ? <span className="situation withdrawn">Desistente</span>
    : <span className="situation active">Ativo</span>;
}

export function StatusLegend() {
  return <span className="status-legend"><span><i className="dot paid-dot" /> <CheckCircle2 /> Pago</span><span><i className="dot pending-dot" /> <Clock3 /> Pendente</span></span>;
}

export function AuthScreen({ mode, onAuthenticated }: { mode: "setup" | "login"; onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("Use pelo menos 6 caracteres.");
    if (mode === "setup" && password !== confirm) return setError("As senhas não são iguais.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-grid" />
      <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" />
      <section className="auth-card">
        <Logo />
        <div className="auth-icon"><LockKeyhole size={25} /></div>
        <div className="auth-copy">
          <span className="eyebrow">ACESSO ADMINISTRATIVO</span>
          <h1>{mode === "setup" ? "Crie a senha do caderno" : "Bem-vindo de volta"}</h1>
          <p>{mode === "setup" ? "Essa senha protegerá alunos, telefones e registros de pagamento." : "Digite sua senha para acessar o controle de pagamentos."}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
          {mode === "setup" && <><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></>}
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="auth-submit">{busy ? <RefreshCw className="spin" /> : <ShieldCheck />}{mode === "setup" ? "Criar senha e entrar" : "Entrar no caderno"}</Button>
        </form>
        <div className="security-note"><ShieldCheck size={16} /> Dados protegidos por senha e sessão segura.</div>
      </section>
    </main>
  );
}
