"use client";

import { Check, ExternalLink, History, MessageCircle, Play, Send, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_COLUMNS, type BookState, type MessageLog, type PaymentColumnId, type Student } from "@/app/lib/seed-data";
import { classList } from "./shared";

function messageFor(template: string, student: Student, column: PaymentColumnId) {
  const label = PAYMENT_COLUMNS.find((item) => item.id === column)?.label ?? column;
  return template.replaceAll("{nome}", student.name.split(" ")[0]).replaceAll("{nome_completo}", student.name).replaceAll("{turma}", student.className).replaceAll("{item}", label);
}

function whatsappUrl(student: Student, message: string) {
  const digits = student.phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppCenter({ state, onTemplate, onLog }: { state: BookState; onTemplate: (value: string) => void; onLog: (log: MessageLog) => void }) {
  const classes = classList(state.students);
  const [selectedClass, setSelectedClass] = useState(classes[0] ?? "");
  const [column, setColumn] = useState<PaymentColumnId>("2026-09");
  const [draft, setDraft] = useState(state.messageTemplate);
  const [batchIndex, setBatchIndex] = useState<number | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const queue = useMemo(() => state.students.filter((student) => student.className === selectedClass && student.situation === "active" && student.payments[column] === "pending"), [state.students, selectedClass, column]);
  const current = batchIndex === null ? null : queue[batchIndex] ?? null;
  const latest = [...state.messageHistory].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 12);

  function open(student: Student) {
    window.open(whatsappUrl(student, messageFor(draft, student, column)), "_blank", "noopener,noreferrer");
  }

  function saveTemplate() {
    onTemplate(draft); setSavedNotice(true); setTimeout(() => setSavedNotice(false), 1600);
  }

  function startBatch() {
    if (!queue.length) return;
    setBatchIndex(0); open(queue[0]);
  }

  function confirmAndNext() {
    if (!current) return;
    const text = messageFor(draft, current, column);
    onLog({ id: crypto.randomUUID(), studentId: current.id, columnId: column, sentAt: new Date().toISOString(), text });
    const next = (batchIndex ?? 0) + 1;
    if (next >= queue.length) { setBatchIndex(null); return; }
    setBatchIndex(next); open(queue[next]);
  }

  const previewStudent = current ?? queue[0];
  return <div className="view-stack">
    <section className="page-title-row"><div><span className="eyebrow">WHATSAPP POR SALA</span><h1>Fila de mensagens</h1><p>Prepare sua mensagem, abra as conversas em sequência e registre cada envio.</p></div><div className="whatsapp-badge"><MessageCircle /><div><strong>{queue.length}</strong><span>na fila atual</span></div></div></section>
    <section className="whatsapp-grid">
      <article className="panel message-builder">
        <div className="panel-heading"><div><span className="eyebrow">MODELO PERSONALIZADO</span><h2>Crie sua mensagem</h2></div><Smartphone /></div>
        <div className="wa-controls"><label><span>Turma</span><select value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); setBatchIndex(null); }}>{classes.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>Item pendente</span><select value={column} onChange={(event) => { setColumn(event.target.value as PaymentColumnId); setBatchIndex(null); }}>{PAYMENT_COLUMNS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>
        <label className="template-label"><span>Texto da mensagem</span><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} maxLength={3000} /></label>
        <div className="variables"><span>Variáveis:</span>{["{nome}", "{nome_completo}", "{turma}", "{item}"].map((variable) => <button key={variable} onClick={() => setDraft((value) => `${value} ${variable}`)}>{variable}</button>)}</div>
        <div className="builder-actions"><Button variant="outline" onClick={saveTemplate}>{savedNotice ? <Check /> : <Send />}{savedNotice ? "Modelo salvo" : "Salvar modelo"}</Button><Button className="whatsapp-button" onClick={startBatch} disabled={!queue.length}><Play /> Iniciar lote ({queue.length})</Button></div>
        <div className="automation-note"><strong>Envio gratuito assistido</strong><p>O WhatsApp abre com o texto pronto. Você confirma o envio e volta para avançar. Envio totalmente automático só funciona com a API oficial do WhatsApp.</p></div>
      </article>
      <article className="panel phone-preview"><div className="phone-top"><span /><strong>Prévia</strong><span /></div><div className="phone-chat"><div className="chat-day">HOJE</div><div className="chat-bubble">{previewStudent ? messageFor(draft, previewStudent, column) : "Não há alunos pendentes para essa seleção."}<small>10:32 ✓✓</small></div></div>{previewStudent && <div className="preview-recipient"><span>Mensagem para</span><strong>{previewStudent.name}</strong><small>{previewStudent.phone} · {previewStudent.className}</small></div>}</article>
    </section>
    {current && <section className="panel batch-panel"><div><span className="eyebrow">LOTE EM ANDAMENTO</span><h2>{batchIndex! + 1} de {queue.length} · {current.name}</h2><p>Após confirmar o envio no WhatsApp, registre e avance para o próximo.</p></div><div><Button variant="outline" onClick={() => open(current)}><ExternalLink /> Abrir novamente</Button><Button className="whatsapp-button" onClick={confirmAndNext}><Check /> Confirmar enviado e próximo</Button></div></section>}
    <section className="panel queue-panel"><div className="panel-heading"><div><span className="eyebrow">ALUNOS PENDENTES</span><h2>Fila de {selectedClass}</h2></div><span className="panel-note">{queue.length} mensagens</span></div><div className="simple-list compact-list"><div className="simple-row simple-header"><span>Aluno</span><span>Telefone</span><span>Item</span><span>Último envio</span><span /></div>{queue.map((student) => { const last = latest.find((log) => log.studentId === student.id && log.columnId === column); return <div className="simple-row" key={student.id}><span><strong>{student.name}</strong><small>{student.registration}</small></span><span>{student.phone}</span><span><b className="pending-chip">Pendente</b></span><span>{last ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(last.sentAt)) : "Nunca enviada"}</span><span><button className="mini-action wa" onClick={() => open(student)}><MessageCircle /> Abrir WhatsApp</button></span></div>; })}{!queue.length && <div className="empty-state"><Check /><strong>Fila concluída</strong><span>Nenhum aluno pendente nessa turma e item.</span></div>}</div></section>
    <section className="panel history-panel"><div className="panel-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Últimos envios registrados</h2></div><History /></div><div className="history-list">{latest.map((log) => { const student = state.students.find((item) => item.id === log.studentId); const item = PAYMENT_COLUMNS.find((value) => value.id === log.columnId); return <div key={log.id}><span className="history-icon"><MessageCircle /></span><p><strong>{student?.name ?? "Aluno"}</strong><span>{student?.className} · {item?.label}</span></p><time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.sentAt))}</time></div>; })}{!latest.length && <div className="empty-report">Nenhuma mensagem registrada ainda.</div>}</div></section>
  </div>;
}
