"use client";

import { Printer, UserMinus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAYMENT_COLUMNS, type BookState, type PaymentColumnId, type Student } from "@/app/lib/seed-data";
import { classList, Logo } from "./shared";

type ReportStatus = "all" | "paid" | "pending" | "withdrawn";

export function Reports({ state }: { state: BookState }) {
  const classes = classList(state.students);
  const [selectedClass, setSelectedClass] = useState(classes[0] ?? "");
  const [column, setColumn] = useState<PaymentColumnId>("2026-09");
  const [status, setStatus] = useState<ReportStatus>("all");
  const room = state.students.filter((student) => student.className === selectedClass);
  const rows = room.filter((student) => {
    if (status === "withdrawn") return student.situation === "withdrawn";
    if (student.situation === "withdrawn") return false;
    return status === "all" || student.payments[column] === status;
  });
  const active = room.filter((student) => student.situation === "active");
  const paid = active.filter((student) => student.payments[column] === "paid").length;
  const pending = active.length - paid;
  const label = PAYMENT_COLUMNS.find((item) => item.id === column)?.label ?? column;
  return <div className="view-stack report-view">
    <section className="page-title-row no-print"><div><span className="eyebrow">RELATÓRIOS</span><h1>Pagos, pendentes e desistentes</h1><p>Escolha a sala, o período ou item e a situação que deseja imprimir.</p></div><Button onClick={() => window.print()} className="print-button"><Printer /> Imprimir relatório</Button></section>
    <section className="panel controls-panel no-print"><label><span>Turma</span><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>{classes.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>Mês ou item</span><select value={column} onChange={(event) => setColumn(event.target.value as PaymentColumnId)}>{PAYMENT_COLUMNS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label><span>Listagem</span><select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus)}><option value="all">Todos os ativos</option><option value="paid">Somente pagos</option><option value="pending">Somente pendentes</option><option value="withdrawn">Desistentes</option></select></label></section>
    <section className="print-sheet panel"><div className="print-heading"><Logo /><div><span>Relatório de pagamentos</span><h2>{selectedClass} · {label}</h2><p>Emitido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date())}</p></div></div><div className="report-kpis"><div><span>Alunos ativos</span><strong>{active.length}</strong></div><div className="report-paid"><span>Pagos</span><strong>{paid}</strong></div><div className="report-pending"><span>Pendentes</span><strong>{pending}</strong></div><div><span>Desistentes</span><strong>{room.length - active.length}</strong></div></div><div className="report-context"><strong>Listagem:</strong> {status === "all" ? "Todos os alunos ativos" : status === "paid" ? "Pagamentos confirmados" : status === "pending" ? "Pagamentos pendentes" : "Alunos desistentes"}<span>{rows.length} registros</span></div><table className="report-table"><thead><tr><th>#</th><th>Matrícula</th><th>Aluno</th><th>Telefone</th><th>Turma</th><th>Situação em {label}</th></tr></thead><tbody>{rows.map((student, index) => <tr key={student.id}><td>{index + 1}</td><td>{student.registration}</td><td><strong>{student.name}</strong></td><td>{student.phone}</td><td>{student.className}</td><td><span className={student.situation === "withdrawn" ? "report-status withdrawn" : student.payments[column] === "paid" ? "report-status paid" : "report-status pending"}>{student.situation === "withdrawn" ? "Desistente" : student.payments[column] === "paid" ? "Pago" : "Pendente"}</span></td></tr>)}</tbody></table>{!rows.length && <div className="empty-report">Nenhum registro para os filtros escolhidos.</div>}<div className="report-footer"><span>Caderno de Pagamentos COC</span><span>Relatório quantitativo — sem valores financeiros</span></div></section>
  </div>;
}

export function Withdrawn({ state, onSituation }: { state: BookState; onSituation: (student: Student) => void }) {
  const students = state.students.filter((student) => student.situation === "withdrawn").sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
  return <div className="view-stack"><section className="page-title-row"><div><span className="eyebrow">SITUAÇÃO ACADÊMICA</span><h1>Alunos desistentes</h1><p>Esses alunos não entram nos cálculos de pagamentos e inadimplência.</p></div><div className="big-count"><strong>{students.length}</strong><span>desistentes</span></div></section><section className="panel simple-list"><div className="simple-row simple-header"><span>Aluno</span><span>Matrícula</span><span>Turma</span><span>Telefone</span><span>Data</span><span /></div>{students.map((student) => <div className="simple-row" key={student.id}><span><strong>{student.name}</strong></span><span className="mono">{student.registration}</span><span><b className="class-pill">{student.className}</b></span><span>{student.phone}</span><span>{student.situationChangedAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(student.situationChangedAt)) : "—"}</span><span><button className="mini-action restore" onClick={() => onSituation(student)}>Reativar</button></span></div>)}{!students.length && <div className="empty-state"><UserMinus /><strong>Nenhum desistente</strong><span>Os alunos marcados aparecerão aqui.</span></div>}</section></div>;
}
