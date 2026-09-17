"use client";

import { GraduationCap, Search, UserPlus, Upload } from "lucide-react";
import { useState } from "react";
import { type BookState, type PaymentColumn, type PaymentColumnId, type PaymentStatus, type Student } from "@/app/lib/seed-data";
import { classList, normalize, PaymentSelect, SituationBadge, StatusLegend } from "./shared";

export function Notebook({ state, columns, selectedClass, onClassChange, onPayment, onSituation, onAddStudent, onImport }: {
  state: BookState;
  columns: PaymentColumn[];
  selectedClass: string;
  onClassChange: (value: string) => void;
  onPayment: (studentId: string, column: PaymentColumnId, status: PaymentStatus) => void;
  onSituation: (student: Student) => void;
  onAddStudent: () => void;
  onImport: () => void;
}) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<"all" | "active" | "withdrawn">("active");
  const classes = classList(state.students);
  const room = state.students.filter((student) => student.className === selectedClass);
  const visible = room.filter((student) => {
    if (show !== "all" && student.situation !== show) return false;
    const query = normalize(search.trim());
    return !query || normalize(`${student.name} ${student.registration} ${student.phone}`).includes(query);
  });
  const active = room.filter((student) => student.situation === "active");
  const paid = active.reduce((sum, student) => sum + columns.filter((column) => student.payments[column.id] === "paid").length, 0);
  const total = active.length * columns.length;

  return <div className="view-stack">
    <section className="page-title-row"><div><span className="eyebrow">CADERNO DIGITAL</span><h1>Controle por sala</h1><p>Inclua, importe ou mova alunos para inativos sem perder o histórico.</p></div><div className="student-actions"><button className="action-button secondary" onClick={onImport}><Upload size={16}/> Importar CSV</button><button className="action-button" onClick={onAddStudent}><UserPlus size={16}/> Novo aluno</button></div></section>
    <section className="panel controls-panel">
      <label><span>Turma</span><select value={selectedClass} onChange={(event) => onClassChange(event.target.value)}>{classes.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="search-control"><span>Buscar aluno</span><div><Search size={17} /><input placeholder="Nome, matrícula ou telefone" value={search} onChange={(event) => setSearch(event.target.value)} /></div></label>
      <label><span>Situação</span><select value={show} onChange={(event) => setShow(event.target.value as typeof show)}><option value="active">Ativos</option><option value="withdrawn">Desistentes</option><option value="all">Todos</option></select></label>
    </section>
    <section className="panel notebook-panel">
      <div className="notebook-caption"><div><GraduationCap size={20} /><strong>{selectedClass}</strong><span>{visible.length} alunos exibidos</span></div><StatusLegend /></div>
      <div className="notebook-scroll"><table className="notebook-table"><thead><tr><th className="sticky-col reg-col">Matrícula</th><th className="sticky-col name-col">Aluno</th><th>Telefone</th><th>Situação</th>{columns.map((column) => <th key={column.id}>{column.shortLabel}</th>)}<th>Ação</th></tr></thead><tbody>{visible.map((student) => <tr key={student.id} className={student.situation === "withdrawn" ? "row-withdrawn" : ""}><td className="sticky-col reg-col mono">{student.registration}</td><td className="sticky-col name-col"><strong>{student.name}</strong></td><td className="phone-cell">{student.phone}</td><td><SituationBadge student={student} /></td>{columns.map((column) => <td key={column.id}><PaymentSelect value={student.payments[column.id] ?? "pending"} disabled={student.situation === "withdrawn"} onChange={(status) => onPayment(student.id, column.id, status)} /></td>)}<td><button className={student.situation === "withdrawn" ? "mini-action restore" : "mini-action withdraw"} onClick={() => onSituation(student)}>{student.situation === "withdrawn" ? "Reativar" : "Mover para inativos"}</button></td></tr>)}</tbody></table>{!visible.length && <div className="empty-state"><Search /><strong>Nenhum aluno encontrado</strong><span>Revise a busca ou os filtros.</span></div>}</div>
    </section>
  </div>;
}
