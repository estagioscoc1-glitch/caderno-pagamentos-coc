"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenCheck, ChevronRight, FileDown, LayoutDashboard, LogOut, Menu, MessageCircle, RefreshCw, ShieldCheck, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthScreen, classList, Logo } from "@/app/components/shared";
import { Dashboard } from "@/app/components/dashboard";
import { Notebook } from "@/app/components/notebook";
import { Reports, Withdrawn } from "@/app/components/reports";
import { WhatsAppCenter } from "@/app/components/whatsapp";
import { Security } from "@/app/components/security";
import { CLASS_ORDER, type BookState, type MessageLog, type PaymentColumnId, type PaymentStatus, type Student } from "@/app/lib/seed-data";

type View = "dashboard" | "notebook" | "reports" | "whatsapp" | "withdrawn" | "security";
type AuthState = "loading" | "setup" | "login" | "authenticated";
type SaveState = "saved" | "saving" | "error";

export default function Home() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [state, setState] = useState<BookState | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [selectedClass, setSelectedClass] = useState<string>(CLASS_ORDER[0]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [confirmStudent, setConfirmStudent] = useState<Student | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.status === 401) return setAuth("login");
    if (!response.ok) throw new Error("Não foi possível carregar o caderno.");
    const result = (await response.json()) as BookState;
    setState(result); setAuth("authenticated");
    setSelectedClass((current) => result.students.some((student) => student.className === current) ? current : (classList(result.students)[0] ?? ""));
  }, []);

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" }).then(async (response) => {
      const result = (await response.json()) as { configured: boolean; authenticated: boolean };
      if (!result.configured) setAuth("setup");
      else if (!result.authenticated) setAuth("login");
      else await loadState();
    }).catch(() => setAuth("login"));
  }, [loadState]);

  async function persist(next: BookState) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (response.status === 401) { setAuth("login"); return; }
      if (!response.ok) throw new Error();
      const saved = (await response.json()) as BookState;
      setState((current) => current ? { ...current, updatedAt: saved.updatedAt } : current);
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }

  function update(mutator: (current: BookState) => BookState) {
    if (!state) return;
    const next = { ...mutator(state), updatedAt: new Date().toISOString() };
    setState(next); setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 450);
  }

  function payment(studentId: string, column: PaymentColumnId, status: PaymentStatus) {
    update((current) => ({ ...current, students: current.students.map((student) => student.id === studentId ? { ...student, payments: { ...student.payments, [column]: status } } : student) }));
  }

  function confirmSituation() {
    if (!confirmStudent) return;
    const nextSituation = confirmStudent.situation === "withdrawn" ? "active" : "withdrawn";
    update((current) => ({ ...current, students: current.students.map((student) => student.id === confirmStudent.id ? { ...student, situation: nextSituation, situationChangedAt: new Date().toISOString() } : student) }));
    setConfirmStudent(null);
  }

  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setState(null); setAuth("login");
  }

  if (auth === "loading") return <main className="loading-screen"><div className="loading-logo">COC</div><RefreshCw className="spin" /><span>Preparando seu caderno...</span></main>;
  if (auth === "setup" || auth === "login") return <AuthScreen mode={auth} onAuthenticated={() => void loadState()} />;
  if (!state) return <main className="loading-screen"><RefreshCw className="spin" /></main>;

  const nav = [
    { id: "dashboard" as View, label: "Dashboard", icon: <LayoutDashboard /> },
    { id: "notebook" as View, label: "Caderno por sala", icon: <BookOpenCheck /> },
    { id: "reports" as View, label: "Relatórios", icon: <FileDown /> },
    { id: "whatsapp" as View, label: "WhatsApp", icon: <MessageCircle /> },
    { id: "withdrawn" as View, label: "Desistentes", icon: <UserMinus /> },
    { id: "security" as View, label: "Segurança", icon: <ShieldCheck /> },
  ];
  const title = nav.find((item) => item.id === view)?.label;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}><div className="sidebar-top"><Logo /><button className="mobile-close" onClick={() => setMobileMenu(false)}><X /></button></div><div className="sidebar-section-label">NAVEGAÇÃO</div><nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); }}>{item.icon}<span>{item.label}</span>{view === item.id && <i />}</button>)}</nav><div className="sidebar-semester"><div><BookOpenCheck /></div><span>Período letivo</span><strong>2026/2</strong><small>Setembro a fevereiro</small></div><button className="logout-button" onClick={() => void logout()}><LogOut /><span>Sair do sistema</span></button></aside>
    {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Fechar menu" />}
    <main className="main-area"><header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(true)}><Menu /></button><div><span className="breadcrumb">Caderno COC <ChevronRight size={13} /> {title}</span><strong>{title}</strong></div><div className={`save-indicator ${saveState}`}><i />{saveState === "saving" ? "Salvando..." : saveState === "error" ? "Erro ao salvar" : "Tudo salvo"}</div></header><div className="content-area">
      {view === "dashboard" && <Dashboard state={state} onOpenClass={(name) => { setSelectedClass(name); setView("notebook"); }} />}
      {view === "notebook" && <Notebook state={state} selectedClass={selectedClass} onClassChange={setSelectedClass} onPayment={payment} onSituation={setConfirmStudent} />}
      {view === "reports" && <Reports state={state} />}
      {view === "whatsapp" && <WhatsAppCenter state={state} onTemplate={(messageTemplate) => update((current) => ({ ...current, messageTemplate }))} onLog={(log: MessageLog) => update((current) => ({ ...current, messageHistory: [...current.messageHistory, log] }))} />}
      {view === "withdrawn" && <Withdrawn state={state} onSituation={setConfirmStudent} />}
      {view === "security" && <Security onPasswordChanged={() => { setState(null); setAuth("login"); }} />}
    </div></main>
    <Dialog open={Boolean(confirmStudent)} onOpenChange={(open) => !open && setConfirmStudent(null)}><DialogContent><DialogHeader><DialogTitle>{confirmStudent?.situation === "withdrawn" ? "Reativar aluno?" : "Marcar como desistente?"}</DialogTitle><DialogDescription>{confirmStudent?.situation === "withdrawn" ? `${confirmStudent?.name} voltará aos indicadores e ao caderno de pagamentos.` : `${confirmStudent?.name} sairá dos cálculos de pagamento e inadimplência. O histórico será preservado.`}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmStudent(null)}>Cancelar</Button><Button variant={confirmStudent?.situation === "withdrawn" ? "default" : "destructive"} onClick={confirmSituation}>{confirmStudent?.situation === "withdrawn" ? "Reativar aluno" : "Confirmar desistência"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
