import { INITIAL_STATE, PAYMENT_COLUMNS, type BookState, type MessageLog, type PaymentStatus, type Student } from "./seed-data";

export type PaymentColumnId = string;
export type PaymentColumn = { id: string; label: string; shortLabel: string; kind: "month" | "extra" };
export type Semester = { id: string; label: string; startMonth: string; endMonth: string; paymentColumns: PaymentColumn[]; createdAt: string };
export type ManagedStudent = Omit<Student, "payments"> & { cpf?: string; semesterId?: string; payments: Record<string, PaymentStatus> };
export type ManagedMessageLog = Omit<MessageLog, "columnId"> & { columnId: string };
export type ManagedBookState = Omit<BookState, "students" | "messageHistory"> & {
  students: ManagedStudent[]; messageHistory: ManagedMessageLog[]; semesters?: Semester[]; activeSemesterId?: string;
};

export const DEFAULT_SEMESTER: Semester = { id:"2026-2", label:"2026/2", startMonth:"2026-09", endMonth:"2027-02", paymentColumns:[...PAYMENT_COLUMNS], createdAt:"2026-09-01T12:00:00.000Z" };
const NAMES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export function semesterColumns(label:string):PaymentColumn[]{
 const match=/^(\d{4})\/(1|2)$/.exec(label.trim()); if(!match)throw new Error("Use o formato 2027/1 ou 2027/2.");
 const year=Number(match[1]),first=match[2]==="1"?3:9;
 const months=Array.from({length:6},(_,i)=>{const absolute=first-1+i,y=year+Math.floor(absolute/12),m=absolute%12+1;return{id:`${y}-${String(m).padStart(2,"0")}`,label:`${NAMES[m-1]}/${String(y).slice(-2)}`,shortLabel:`${NAMES[m-1].slice(0,3)}/${String(y).slice(-2)}`,kind:"month" as const};});
 return [...months,{id:"insurance",label:"Seguro",shortLabel:"Seguro",kind:"extra"},{id:"initial-kit",label:"Kit inicial",shortLabel:"Kit",kind:"extra"},{id:"enrollment",label:"Matrícula",shortLabel:"Matrícula",kind:"extra"},{id:"dependency",label:"Dependência",shortLabel:"Dep.",kind:"extra"}];
}
export function normalizeBookState(value:BookState|ManagedBookState):ManagedBookState{
 const state=value as ManagedBookState,semesters=state.semesters?.length?state.semesters:[DEFAULT_SEMESTER];
 const activeSemesterId=semesters.some(x=>x.id===state.activeSemesterId)?state.activeSemesterId!:semesters[0].id;
 return {...state,semesters,activeSemesterId,students:state.students.map(s=>({...s,semesterId:s.semesterId??DEFAULT_SEMESTER.id,cpf:s.cpf??""}))};
}
export const NORMALIZED_INITIAL_STATE=normalizeBookState(INITIAL_STATE);
