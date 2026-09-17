"use client";
import { Printer, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type BookState, type PaymentColumn, type Student } from "@/app/lib/seed-data";
import { classList, Logo } from "./shared";
type ReportStatus = "all" | "paid" | "pending" | "withdrawn";

export function Reports({ state, columns }: { state: BookState; columns: PaymentColumn[] }) {
  const classes = classList(state.students), [selectedClass,setSelectedClass]=useState(classes[0]??"");
  const [column,setColumn]=useState(columns[0]?.id??""), [status,setStatus]=useState<ReportStatus>("all");
  useEffect(()=>{if(!classes.includes(selectedClass))setSelectedClass(classes[0]??"");},[classes.join("|"),selectedClass]);
  useEffect(()=>{if(!columns.some(x=>x.id===column))setColumn(columns[0]?.id??"");},[columns,column]);
  const room=state.students.filter(s=>s.className===selectedClass), active=room.filter(s=>s.situation==="active");
  const rows=room.filter(s=>status==="withdrawn"?s.situation==="withdrawn":s.situation==="active"&&(status==="all"||(s.payments[column]??"pending")===status));
  const paid=active.filter(s=>s.payments[column]==="paid").length, pending=active.length-paid;
  const label=columns.find(x=>x.id===column)?.label??column;
  return <div className="view-stack report-view">
    <section className="page-title-row no-print"><div><span className="eyebrow">RELATÓRIOS</span><h1>Pagos, pendentes e inativos</h1><p>Escolha a sala, o item e a situação que deseja imprimir.</p></div><Button onClick={()=>window.print()} className="print-button"><Printer/> Imprimir relatório</Button></section>
    <section className="panel controls-panel no-print"><label><span>Turma</span><select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>{classes.map(x=><option key={x}>{x}</option>)}</select></label><label><span>Mês ou item</span><select value={column} onChange={e=>setColumn(e.target.value)}>{columns.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}</select></label><label><span>Listagem</span><select value={status} onChange={e=>setStatus(e.target.value as ReportStatus)}><option value="all">Todos os ativos</option><option value="paid">Somente pagos</option><option value="pending">Somente pendentes</option><option value="withdrawn">Inativos</option></select></label></section>
    <section className="print-sheet panel"><div className="print-heading"><Logo/><div><span>Relatório de pagamentos</span><h2>{selectedClass} · {label}</h2><p>Emitido em {new Intl.DateTimeFormat("pt-BR",{dateStyle:"full"}).format(new Date())}</p></div></div><div className="report-kpis"><div><span>Alunos ativos</span><strong>{active.length}</strong></div><div className="report-paid"><span>Pagos</span><strong>{paid}</strong></div><div className="report-pending"><span>Pendentes</span><strong>{pending}</strong></div><div><span>Inativos</span><strong>{room.length-active.length}</strong></div></div><div className="report-context"><strong>Listagem:</strong> {status==="all"?"Todos os alunos ativos":status==="paid"?"Pagamentos confirmados":status==="pending"?"Pagamentos pendentes":"Alunos inativos"}<span>{rows.length} registros</span></div><table className="report-table"><thead><tr><th>#</th><th>Matrícula</th><th>Aluno</th><th>Telefone</th><th>Turma</th><th>Situação em {label}</th></tr></thead><tbody>{rows.map((s,i)=><tr key={s.id}><td>{i+1}</td><td>{s.registration}</td><td><strong>{s.name}</strong></td><td>{s.phone}</td><td>{s.className}</td><td><span className={s.situation==="withdrawn"?"report-status withdrawn":s.payments[column]==="paid"?"report-status paid":"report-status pending"}>{s.situation==="withdrawn"?"Inativo":s.payments[column]==="paid"?"Pago":"Pendente"}</span></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-report">Nenhum registro para os filtros escolhidos.</div>}<div className="report-footer"><span>Caderno de Pagamentos COC</span><span>Relatório quantitativo — sem valores financeiros</span></div></section>
  </div>;
}

export function Withdrawn({state,onSituation}:{state:BookState;onSituation:(student:Student)=>void}){
 const students=state.students.filter(s=>s.situation==="withdrawn").sort((a,b)=>a.className.localeCompare(b.className)||a.name.localeCompare(b.name));
 return <div className="view-stack"><section className="page-title-row"><div><span className="eyebrow">SITUAÇÃO ACADÊMICA</span><h1>Alunos inativos</h1><p>O histórico permanece preservado e o aluno pode ser restaurado.</p></div><div className="big-count"><strong>{students.length}</strong><span>inativos</span></div></section><section className="panel simple-list"><div className="simple-row simple-header"><span>Aluno</span><span>Matrícula</span><span>Turma</span><span>Telefone</span><span>Data</span><span/></div>{students.map(s=><div className="simple-row" key={s.id}><span><strong>{s.name}</strong></span><span className="mono">{s.registration}</span><span><b className="class-pill">{s.className}</b></span><span>{s.phone}</span><span>{s.situationChangedAt?new Intl.DateTimeFormat("pt-BR").format(new Date(s.situationChangedAt)):"—"}</span><span><button className="mini-action restore" onClick={()=>onSituation(s)}>Restaurar</button></span></div>)}{!students.length&&<div className="empty-state"><UserMinus/><strong>Nenhum aluno inativo</strong><span>Os alunos removidos das turmas aparecerão aqui.</span></div>}</section></div>;
}
