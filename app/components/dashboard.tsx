"use client";

import { CheckCircle2, ChevronRight, Clock3, TrendingUp, UserMinus, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Progress } from "@/components/ui/progress";
import { PAYMENT_COLUMNS, type BookState } from "@/app/lib/seed-data";
import { classList, number } from "./shared";

function StatCard({ label, value, detail, tone, icon }: { label: string; value: string | number; detail: string; tone: string; icon: React.ReactNode }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value}</strong><small>{detail}</small></article>;
}

export function Dashboard({ state, onOpenClass }: { state: BookState; onOpenClass: (name: string) => void }) {
  const active = state.students.filter((student) => student.situation === "active");
  const withdrawn = state.students.length - active.length;
  const totalExpected = active.length * PAYMENT_COLUMNS.length;
  const paid = active.reduce((sum, student) => sum + PAYMENT_COLUMNS.filter((column) => student.payments[column.id] === "paid").length, 0);
  const pending = totalExpected - paid;
  const rate = totalExpected ? Math.round((paid / totalExpected) * 100) : 0;
  const monthData = PAYMENT_COLUMNS.map((column) => {
    const count = active.filter((student) => student.payments[column.id] === "paid").length;
    return { name: column.shortLabel, Pagos: count, taxa: active.length ? Math.round((count / active.length) * 100) : 0 };
  });
  const classes = classList(state.students).map((className) => {
    const room = active.filter((student) => student.className === className);
    const expected = room.length * PAYMENT_COLUMNS.length;
    const confirmed = room.reduce((sum, student) => sum + PAYMENT_COLUMNS.filter((column) => student.payments[column.id] === "paid").length, 0);
    return { className, students: room.length, paid: confirmed, pending: expected - confirmed, rate: expected ? Math.round((confirmed / expected) * 100) : 0 };
  });

  return <div className="view-stack">
    <section className="hero-panel">
      <div><span className="eyebrow hero-eyebrow">VISÃO GERAL · 2026/2</span><h1>Panorama dos pagamentos</h1><p>Acompanhe cada turma sem valores — somente confirmações, pendências e desistências.</p></div>
      <div className="score-ring" style={{ "--score": `${rate * 3.6}deg` } as React.CSSProperties}><div><strong>{rate}%</strong><span>recebido</span></div></div>
    </section>
    <section className="stat-grid">
      <StatCard label="ALUNOS ATIVOS" value={number.format(active.length)} detail={`${classList(state.students).length} turmas`} tone="blue" icon={<Users />} />
      <StatCard label="PAGAMENTOS" value={number.format(paid)} detail="confirmações registradas" tone="green" icon={<CheckCircle2 />} />
      <StatCard label="PENDÊNCIAS" value={number.format(pending)} detail="itens ainda em aberto" tone="red" icon={<Clock3 />} />
      <StatCard label="INADIMPLÊNCIA" value={`${100 - rate}%`} detail="sobre os itens previstos" tone="amber" icon={<TrendingUp />} />
      <StatCard label="DESISTENTES" value={withdrawn} detail="fora dos indicadores" tone="purple" icon={<UserMinus />} />
    </section>
    <section className="dashboard-grid">
      <article className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">EVOLUÇÃO POR COMPETÊNCIA</span><h2>Pagamentos confirmados</h2></div><span className="legend-paid"><i /> Pago</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthData} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}><defs><linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f6fed" stopOpacity={0.35} /><stop offset="100%" stopColor="#2f6fed" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e6edf7" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#6c7a90", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8a98ab", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dbe5f3", boxShadow: "0 12px 30px rgba(18,38,63,.12)" }} /><Area type="monotone" dataKey="Pagos" stroke="#2f6fed" strokeWidth={3} fill="url(#paidGradient)" /></AreaChart></ResponsiveContainer></div>
        <div className="month-strip">{monthData.map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.taxa}%</strong></div>)}</div>
      </article>
      <article className="panel health-panel"><div className="panel-heading"><div><span className="eyebrow">RESUMO</span><h2>Saúde da carteira</h2></div></div><div className="health-number"><strong>{rate}%</strong><span>taxa geral de pagamento</span></div><Progress value={rate} className="health-progress" /><div className="health-list"><div><span><i className="dot paid-dot" />Pagos</span><strong>{number.format(paid)}</strong></div><div><span><i className="dot pending-dot" />Pendentes</span><strong>{number.format(pending)}</strong></div><div><span><i className="dot student-dot" />Alunos ativos</span><strong>{number.format(active.length)}</strong></div></div></article>
    </section>
    <section className="panel rooms-panel"><div className="panel-heading"><div><span className="eyebrow">DESEMPENHO POR SALA</span><h2>Turmas em acompanhamento</h2></div><span className="panel-note">Clique para abrir o caderno</span></div><div className="room-table"><div className="room-row room-header"><span>Turma</span><span>Alunos</span><span>Pagos</span><span>Pendentes</span><span>Desempenho</span><span /></div>{classes.map((room) => <button className="room-row" key={room.className} onClick={() => onOpenClass(room.className)}><span className="room-name"><i>{room.className.slice(0, 3)}</i><strong>{room.className}</strong></span><span>{room.students}</span><span className="text-paid">{room.paid}</span><span className="text-pending">{room.pending}</span><span className="room-progress"><i><b style={{ width: `${room.rate}%` }} /></i><strong>{room.rate}%</strong></span><ChevronRight size={18} /></button>)}</div></section>
  </div>;
}
