import { useEffect, useRef, useState } from "react"
import { format, startOfWeek, addDays, getDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Search, X, Check, FileDown, MessageCircle, Loader2, Trash2, RotateCcw, Printer, Loader, Info } from "lucide-react"
import html2pdf from "html2pdf.js"
import html2canvas from "html2canvas"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"

// ─── Constants ────────────────────────────────────────────────────────────────
const DIAS_PT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]
const TURNOS  = ["N","M","T"] as const
type TurnoLetra = (typeof TURNOS)[number]
type PostoTipo  = "auxiliar" | "doutor"

const SHIFT_BG: Record<TurnoLetra, string> = { N:"#BDD7EE", M:"#C6EFCE", T:"#FFEB9C" }
const DAY_BG = ["#DCE6F1","#EBF1DE","#E6E0EC","#DDEEFF","#FFE6CC","#FFF2CC","#F2F2F2"]

const POSTOS = [
  { key:"RX_URG",    label:"RX URG",             bg:"#FFFFFF" },
  { key:"TAC1",      label:"TAC 1",              bg:"#FFFFFF" },
  { key:"TAC2",      label:"TAC 2",              bg:"#FFFFFF" },
  { key:"EXAM1",     label:"Exames Comp. (1)",   bg:"#C4B09A" },
  { key:"EXAM2",     label:"Exames Comp. (2)",   bg:"#C4B09A" },
  { key:"SALA6",     label:"SALA 6 BB",          bg:"#92D050" },
  { key:"SALA7",     label:"SALA 7 EXT",         bg:"#92D050" },
  { key:"TRANSPORT", label:"Transportes INT/URG", bg:"#FFBE7B" },
] as const
type PostoKey = (typeof POSTOS)[number]["key"]

type DayType = "weekday" | "saturday" | "sunday"
const POSTO_SCHEDULE: Record<PostoKey, { shifts: TurnoLetra[]; days: DayType[] }> = {
  RX_URG:    { shifts: ["M","T","N"], days: ["weekday","saturday","sunday"] },
  TAC2:      { shifts: ["M","T","N"], days: ["weekday","saturday","sunday"] },
  EXAM1:     { shifts: ["M","T"],    days: ["weekday","saturday","sunday"] },
  EXAM2:     { shifts: ["M","T"],    days: ["weekday","saturday"] },
  TRANSPORT: { shifts: ["M","T"],    days: ["weekday","saturday","sunday"] },
  TAC1:      { shifts: ["M","T"],    days: ["weekday","saturday"] },
  SALA6:     { shifts: ["M"],        days: ["weekday","saturday","sunday"] },
  SALA7:     { shifts: ["M","T"],    days: ["weekday","saturday","sunday"] },
}

function getPostoTipo(posto: PostoKey, turno: TurnoLetra): PostoTipo {
  return (posto === "EXAM1" || posto === "EXAM2") && turno === "N" ? "doutor" : "auxiliar"
}
function postoInfo(key: PostoKey) { return POSTOS.find(p => p.key===key)! }

// ─── Config ───────────────────────────────────────────────────────────────────
const HORARIOS_KEY = "cfg_horarios"
const DEFAULT_CFG = { maxTurnosSemana: 5, maxTurnosNoturnos: 2, bloquearTurnosConsecutivos: true, horasDescansMinimas: 11, maxDiasConsecutivos: 6, maxTurnosMes: 22, maxTurnosNoturnosMes: 4, alertasConflito: true, permitirSubstituicoes: false }
function loadCfg() {
  try { const r = localStorage.getItem(HORARIOS_KEY); return r ? { ...DEFAULT_CFG, ...JSON.parse(r) } : DEFAULT_CFG }
  catch { return DEFAULT_CFG }
}

// ─── Helpers de descanso ─────────────────────────────────────────────────────
function toMinutesSem(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
function restHoursBetweenSem(prev: { horario_inicio: string; horario_fim: string }, nextInicio: string): number {
  if (!prev.horario_inicio || !prev.horario_fim || !nextInicio) return 24
  const prevStart = toMinutesSem(prev.horario_inicio)
  const prevEnd   = toMinutesSem(prev.horario_fim)
  const nextStart = toMinutesSem(nextInicio)
  const crossesDay = prevEnd < prevStart
  const gapMin = crossesDay ? nextStart - prevEnd : nextStart + 1440 - prevEnd
  return gapMin / 60
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface EscalaRow { id:string; data:string; posto:string; turno_letra:string; auxiliar_id:string|null; doutor_id:string|null }
interface MensalEntry { id:string; data:string; auxiliar_id:string|null; turno_id:string|null }
interface TurnoComPostos { id:string; nome:string; horario_inicio:string; horario_fim:string; postos:string[] }
interface UndoState { inserted:EscalaRow[]; deleted:EscalaRow[] }
interface Person { id:string; nome:string; trabalha_fds?: boolean }
interface Restricao { id:string; auxiliar_id:string; turno_id:string|null; posto:string|null; motivo:string|null; data_inicio:string|null; data_fim:string|null }

// ─── Table styles ─────────────────────────────────────────────────────────────
const B = "1px solid #BBBBBB"
const thBase: React.CSSProperties = { border:B, padding:"4px 8px", textAlign:"center", fontWeight:700, fontSize:"11px", whiteSpace:"nowrap" }
const cellBase: React.CSSProperties = { border:B, padding:"2px 4px", textAlign:"center", cursor:"pointer", fontSize:"11px", fontWeight:600, minWidth:"88px", height:"26px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }

function getInitials(nome: string) {
  const p = nome.trim().split(/\s+/)
  return p.length===1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase()
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onCancel }: { title:string;body:string;onConfirm:()=>void;onCancel:()=>void }) {
  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)",animation:"fadeIn 0.15s ease" }} onClick={onCancel}/>
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:101,width:360,maxWidth:"90vw",background:"#fff",borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",padding:"1.75rem 1.5rem",animation:"slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width:48,height:48,borderRadius:"50%",background:"#FEF2F2",border:"1px solid #FECACA",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem" }}><Trash2 size={22} color="#EF4444"/></div>
        <h3 style={{ textAlign:"center",fontSize:16,fontWeight:700,margin:"0 0 0.5rem",color:"#111" }}>{title}</h3>
        <p style={{ textAlign:"center",fontSize:13,color:"#6B7280",margin:"0 0 1.5rem" }}>{body}</p>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"0.65rem",background:"#F4F4F5",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"0.65rem",background:"#EF4444",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff" }}>Limpar mesmo</button>
        </div>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EscalaSemanal() {
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares] = useState<Person[]>([])
  const [doutores,   setDoutores]   = useState<Person[]>([])
  const [escalas,    setEscalas]    = useState<EscalaRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [mensalEntries, setMensalEntries] = useState<MensalEntry[]>([])
  const [turnosData,    setTurnosData]    = useState<TurnoComPostos[]>([])
  const [restricoes,    setRestricoes]    = useState<Restricao[]>([])
  const [sharingWA,     setSharingWA]     = useState(false)
  const [showToast,  setShowToast]  = useState(false)
  const [toastMsg,   setToastMsg]   = useState("")
  const [undoState,  setUndoState]  = useState<UndoState | null>(null)
  const [undoing,    setUndoing]    = useState(false)
  const [showClear,  setShowClear]  = useState(false)

  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [selCell,     setSelCell]     = useState<{ data:string; turnoLetra:TurnoLetra; posto:PostoKey; tipo:PostoTipo }|null>(null)
  const [selPersonId, setSelPersonId] = useState("")
  const [search,      setSearch]      = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const weekStart = startOfWeek(referenceDate, { weekStartsOn:1 })
  const weekDays  = Array.from({ length:7 }, (_,i) => addDays(weekStart, i))
  const startDate = format(weekDays[0],"yyyy-MM-dd")
  const endDate   = format(weekDays[6],"yyyy-MM-dd")

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)
    const [{ data:a },{ data:d },{ data:e },{ data:m },{ data:t },{ data:r }] = await Promise.all([
      supabase.from("auxiliares").select("id,nome,trabalha_fds").eq("disponivel",true).order("nome"),
      supabase.from("doutores").select("id,nome").order("nome"),
      supabase.from("escalas").select("id,data,posto,turno_letra,auxiliar_id,doutor_id")
        .eq("tipo_escala","semanal")
        .gte("data",startDate).lte("data",endDate)
        .not("posto","is",null).not("turno_letra","is",null),
      supabase.from("escalas").select("id,data,auxiliar_id,turno_id")
        .eq("tipo_escala","mensal")
        .gte("data",startDate).lte("data",endDate)
        .not("turno_id","is",null),
      supabase.from("turnos").select("id,nome,horario_inicio,horario_fim,postos"),
      supabase.from("restricoes").select("id,auxiliar_id,turno_id,posto,motivo,data_inicio,data_fim"),
    ])
    setAuxiliares(a ?? [])
    setDoutores(d ?? [])
    setEscalas(e ?? [])
    setMensalEntries(m ?? [])
    setTurnosData((t ?? []).map(x => ({ ...x, postos: (x.postos as string[] | null) ?? [] })))
    setRestricoes(r ?? [])
    setLoading(false)
  }

  // Refetch rápido só das entradas mensais (triggado pelo Realtime)
  async function refetchMensalEntries() {
    const { data: m } = await supabase
      .from("escalas").select("id,data,auxiliar_id,turno_id")
      .eq("tipo_escala","mensal")
      .gte("data",startDate).lte("data",endDate)
      .not("turno_id","is",null)
    if (m) setMensalEntries(m)
  }

  useEffect(() => { fetchAll() }, [startDate])

  // ── Realtime: mensal → semanal ─────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`semanal-sync-${startDate}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'escalas' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: string; tipo_escala?: string } | undefined
          if (row?.tipo_escala === 'mensal' && row?.data && row.data >= startDate && row.data <= endDate) {
            refetchMensalEntries()
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [startDate, endDate])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function turnoToLetra(t: TurnoComPostos): TurnoLetra | null {
    const n = t.nome.toUpperCase()
    const isNoc = t.horario_inicio >= "20:00"
    if (isNoc || n.startsWith("N")) return "N"
    if (n.startsWith("MT")) return null
    if (n.startsWith("M")) return "M"
    if (n.startsWith("T")) return "T"
    return null
  }

  function postoOpera(posto: PostoKey, turno: TurnoLetra, dateStr: string): boolean {
    const rule = POSTO_SCHEDULE[posto]
    if (!rule) return true
    if (!rule.shifts.includes(turno)) return false
    const d = getDay(parseISO(dateStr))  // 0=Dom, 6=Sáb
    const dayType: DayType = d === 0 ? "sunday" : d === 6 ? "saturday" : "weekday"
    return rule.days.includes(dayType)
  }

  function auxTemRestricao(auxId: string, posto: string, turnoLetra: string, date: string): boolean {
    return restricoes.some(r => {
      if (r.auxiliar_id !== auxId) return false
      if (r.data_fim   && r.data_fim   < date) return false
      if (r.data_inicio && r.data_inicio > date) return false

      if (r.posto) {
        if (r.posto !== posto) return false  // posto diferente → não aplica
        if (r.turno_id) {
          // Restrição combinada: posto E turno têm de coincidir
          const t = turnosData.find(t => t.id === r.turno_id)
          return !!(t && turnoToLetra(t) === turnoLetra)
        }
        return true  // restrição só de posto → aplica a todos os turnos
      }

      if (r.turno_id) {
        // Restrição só de turno → aplica a todos os postos
        const t = turnosData.find(t => t.id === r.turno_id)
        return !!(t && turnoToLetra(t) === turnoLetra)
      }

      return false
    })
  }

  function getEscala(data:string, turnoLetra:string, posto:string): EscalaRow | undefined {
    // 1. Manual semanal override takes priority
    const manual = escalas.find(e => e.data===data && e.turno_letra===turnoLetra && e.posto===posto)
    if (manual) return manual
    // 2. Derive from mensal: find an aux whose turno covers this posto and produces this turno letter
    const mensal = mensalEntries.find(me => {
      if (me.data !== data || !me.auxiliar_id || !me.turno_id) return false
      const t = turnosData.find(t => t.id === me.turno_id)
      if (!t || !t.postos.includes(posto)) return false
      return turnoToLetra(t) === turnoLetra
    })
    if (!mensal?.auxiliar_id) return undefined
    return { id:`mensal_${mensal.id}`, data, posto, turno_letra:turnoLetra, auxiliar_id:mensal.auxiliar_id, doutor_id:null }
  }
  function getCellName(esc: EscalaRow|undefined) {
    if (!esc) return ""
    if (esc.doutor_id)   return doutores.find(d=>d.id===esc.doutor_id)?.nome ?? ""
    if (esc.auxiliar_id) return auxiliares.find(a=>a.id===esc.auxiliar_id)?.nome ?? ""
    return ""
  }

  // ── Dialog ────────────────────────────────────────────────────────────────
  function openCell(data:string, turnoLetra:TurnoLetra, posto:PostoKey) {
    const tipo = getPostoTipo(posto, turnoLetra)
    const ex   = getEscala(data, turnoLetra, posto)
    setSelCell({ data, turnoLetra, posto, tipo })
    setSelPersonId(tipo==="doutor" ? (ex?.doutor_id??"") : (ex?.auxiliar_id??""))
    setSearch(""); setDialogOpen(true)
    setTimeout(() => searchRef.current?.focus(), 60)
  }
  function closeDialog() { setDialogOpen(false); setSearch("") }

  async function saveEscala() {
    if (!selCell || !selPersonId) return
    setSaving(true)
    const ex = getEscala(selCell.data, selCell.turnoLetra, selCell.posto)
    // Only update if it's a real semanal record (not a derived mensal row)
    const realEx = ex && !ex.id.startsWith("mensal_") ? ex : undefined
    const payload = { data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, tipo_escala:"semanal", status:"alocado", auxiliar_id:selCell.tipo==="auxiliar"?selPersonId:null, doutor_id:selCell.tipo==="doutor"?selPersonId:null }
    let savedId: string|null = null
    if (realEx) { const {error}=await supabase.from("escalas").update(payload).eq("id",realEx.id); if(!error) savedId=realEx.id }
    else { const {data:rows,error}=await supabase.from("escalas").insert(payload).select("id"); if(!error&&rows?.length) savedId=rows[0].id }

    // ── Reverse sync: semanal override → upsert registo mensal correspondente ──
    if (savedId && selCell.tipo === "auxiliar") {
      const matchedTurno = turnosData.find(t =>
        t.postos.includes(selCell.posto) && turnoToLetra(t) === selCell.turnoLetra
      )
      if (matchedTurno) {
        const exMensal = mensalEntries.find(
          m => m.auxiliar_id === selPersonId && m.data === selCell.data
        )
        if (exMensal) {
          await supabase.from("escalas").update({ turno_id: matchedTurno.id }).eq("id", exMensal.id)
        } else {
          await supabase.from("escalas").insert({
            auxiliar_id: selPersonId, data: selCell.data,
            tipo_escala: "mensal", turno_id: matchedTurno.id, status: "alocado"
          })
        }
      }
    }

    setSaving(false); closeDialog()
    if (savedId) {
      const nr: EscalaRow = { id:savedId, data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, auxiliar_id:selCell.tipo==="auxiliar"?selPersonId:null, doutor_id:selCell.tipo==="doutor"?selPersonId:null }
      setEscalas(p => realEx ? p.map(e=>e.id===realEx.id?nr:e) : [...p,nr])
    } else fetchAll()
  }

  async function clearEscala() {
    if (!selCell) return
    const ex = getEscala(selCell.data, selCell.turnoLetra, selCell.posto)
    closeDialog()
    // Only delete real semanal records; derived mensal rows cannot be deleted here
    if (ex && !ex.id.startsWith("mensal_")) {
      setEscalas(p=>p.filter(e=>e.id!==ex.id))
      const {error}=await supabase.from("escalas").delete().eq("id",ex.id)
      if(error) fetchAll()
    }
  }

  // ── Limpar semana ─────────────────────────────────────────────────────────
  async function limparSemana() {
    setShowClear(false)
    const toDelete = [...escalas]
    if (!toDelete.length) return
    setUndoState({ inserted:[], deleted:toDelete })
    setEscalas([])
    const ids = toDelete.map(e=>e.id)
    for (let i=0; i<ids.length; i+=50)
      await supabase.from("escalas").delete().in("id", ids.slice(i,i+50))
  }

  // ── Reverter ──────────────────────────────────────────────────────────────
  async function reverter() {
    if (!undoState || undoing) return
    setUndoing(true)
    if (undoState.inserted.length) {
      const ids = undoState.inserted.map(r=>r.id)
      for (let i=0; i<ids.length; i+=50)
        await supabase.from("escalas").delete().in("id", ids.slice(i,i+50))
      setEscalas(p => p.filter(e=>!ids.includes(e.id)))
    }
    if (undoState.deleted.length) {
      const payloads = undoState.deleted.map(({id:_,...rest}) => rest)
      const { data:rows } = await supabase.from("escalas").insert(payloads).select("id,data,posto,turno_letra,auxiliar_id,doutor_id")
      if (rows) setEscalas(p => [...p, ...(rows as EscalaRow[])])
    }
    setUndoState(null); setUndoing(false)
  }

  // ── Generate Table HTML ──────────────────────────────────────────────────
  function generateTableHTML() {
    const wt = `Escala semana ${format(weekDays[0],"d",{locale:ptBR})} a ${format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}`
    const thS=(txt:string,bg:string,ex="")=>`<th style="border:1px solid #999;padding:6px 8px;background:${bg};font-size:10px;font-weight:700;text-align:center;white-space:nowrap;${ex}">${txt}</th>`
    const tdS=(txt:string,bg:string,ex="")=>`<td style="border:1px solid #999;padding:4px 6px;background:${bg};font-size:10px;text-align:center;font-weight:${txt?"600":"400"};${ex}">${txt}</td>`
    let rows=""
    for(const [di,day] of weekDays.entries()){
      const ds=format(day,"yyyy-MM-dd")
      for(const [ti,turno] of TURNOS.entries()){
        rows+="<tr>"
        if(ti===0) rows+=`<td rowspan="3" style="border:1px solid #999;padding:8px;background:${DAY_BG[di%DAY_BG.length]};text-align:center;font-weight:700;font-size:12px;vertical-align:middle;min-width:50px;">${format(day,"d")}<br/><span style="font-size:11px;font-weight:600;">${DIAS_PT[di]}</span></td>`
        rows+=tdS(turno,SHIFT_BG[turno as TurnoLetra],"font-weight:700;min-width:28px;font-size:11px;")
        for(const p of POSTOS) rows+=tdS(getCellName(getEscala(ds,turno,p.key)),p.bg,"min-width:90px;")
        rows+="</tr>"
      }
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${wt}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .page {
      background: white;
      margin: 0 auto;
      padding: 25px 30px;
      max-width: 1200px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 25px;
      border-bottom: 3px solid #1A3A4A;
      padding-bottom: 15px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      color: #1A3A4A;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .header p {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    
    .table-wrapper {
      overflow-x: auto;
      margin: 20px 0;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 10px;
    }
    
    thead {
      background: #f0f0f0;
    }
    
    th {
      border: 1px solid #999;
      padding: 6px 4px;
      background: #D9D9D9;
      font-size: 9px;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      color: #333;
    }
    
    td {
      border: 1px solid #999;
      padding: 5px 4px;
      text-align: center;
      font-weight: 500;
      background: white;
      min-width: 45px;
    }
    
    tbody tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    /* Células de dados */
    tbody td {
      font-size: 9px;
      padding: 4px 3px;
    }
    
    .shift-cell {
      font-weight: 700 !important;
      font-size: 10px !important;
      padding: 4px 4px !important;
    }
    
    .day-header {
      font-weight: 700 !important;
      font-size: 11px !important;
      vertical-align: middle;
      min-width: 50px;
    }
    
    /* Cores dos turnos */
    .shift-n { background: #BDD7EE; color: #000; }
    .shift-m { background: #C6EFCE; color: #000; }
    .shift-t { background: #FFEB9C; color: #000; }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .page {
        box-shadow: none;
        max-width: 100%;
        margin: 0;
        padding: 15mm;
      }
      .header {
        page-break-after: avoid;
      }
      .table-wrapper {
        page-break-inside: avoid;
      }
      table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>📅 Escala Semanal</h1>
      <p>${wt}</p>
    </div>
    
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="min-width:50px;text-align:center;">Dia</th>
            <th style="min-width:28px;">Turno</th>
            <th style="background:#FFD700;">RX URG</th>
            <th style="background:#FFD700;">TAC 1</th>
            <th style="background:#FFD700;">TAC 2</th>
            <th style="background:#FFD700;">Exames<br/>Comp. 1</th>
            <th style="background:#FFD700;">Exames<br/>Comp. 2</th>
            <th style="background:#FFD700;">SALA 6<br/>BB</th>
            <th style="background:#FFD700;">SALA 7<br/>EXT</th>
            <th style="background:#FFD700;">Transportes<br/>INT/URG</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`
  }

  function printEscala() {
    const html = generateTableHTML()
    const w=window.open("","_blank","width=1100,height=700")
    if(!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(()=>w.print(),400)
  }

  function exportPDF() {
    const element = document.createElement("div")
    element.innerHTML = generateTableHTML()
    
    const opt: any = {
      margin: 10,
      filename: `Escala_Semanal_${format(weekDays[0],"yyyy-MM-dd")}.pdf`,
      image: { type: "png", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        compress: true,
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    }
    
    html2pdf().set(opt).from(element).save()
  }

  async function shareWA() {
    if (!tableRef.current) return
    setSharingWA(true)
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })
      
      // Converter canvas para blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSharingWA(false)
          return
        }
        
        try {
          // Copiar imagem para clipboard (API moderna)
          const item = new ClipboardItem({ 'image/png': blob })
          await navigator.clipboard.write([item])
          
          // Mostrar toast de sucesso
          setToastMsg("✅ Imagem copiada! Cole no WhatsApp com Ctrl+V")
          setShowToast(true)
          
          // Auto-hide toast após 3 segundos
          setTimeout(() => setShowToast(false), 3000)
          setSharingWA(false)
          
          // Abrir grupo do WhatsApp após 500ms
          setTimeout(() => {
            window.open("https://chat.whatsapp.com/FUWDNsJBbgn3n6sa6YR6a6?mode=gi_t", "_blank")
          }, 500)
        } catch (clipboardErr) {
          console.error("Erro ao copiar para clipboard:", clipboardErr)
          // Fallback: fazer download se clipboard falhar
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `Escala_Semanal_${format(weekDays[0],"yyyy-MM-dd")}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          setToastMsg("✅ Imagem baixada! Compartilhe manualmente no WhatsApp")
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
          setSharingWA(false)
          
          setTimeout(() => {
            window.open("https://chat.whatsapp.com/FUWDNsJBbgn3n6sa6YR6a6?mode=gi_t", "_blank")
          }, 500)
        }
      }, "image/png")
    } catch (err) {
      console.error("Erro ao capturar tabela:", err)
      setSharingWA(false)
      setToastMsg("❌ Erro ao processar imagem. Abrindo WhatsApp...")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      
      // Abrir WhatsApp mesmo se falhar
      window.open("https://chat.whatsapp.com/FUWDNsJBbgn3n6sa6YR6a6?mode=gi_t", "_blank")
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const personList: Person[] = selCell?.tipo==="doutor" ? doutores : auxiliares
  const filtered = personList.filter(p=>p.nome.toLowerCase().includes(search.toLowerCase()))
  const posto      = selCell ? postoInfo(selCell.posto) : null
  const accentBg   = posto?.bg==="#FFFFFF" ? "#4A90A4" : (posto?.bg ?? "#4A90A4")
  const dayIdx     = selCell ? weekDays.findIndex(d=>format(d,"yyyy-MM-dd")===selCell.data) : -1
  const dayLabel   = dayIdx>=0 ? `${format(weekDays[dayIdx],"d")} ${DIAS_PT[dayIdx]}` : ""
  const _existingEsc = selCell ? getEscala(selCell.data,selCell.turnoLetra,selCell.posto) : undefined
  // Show "Limpar" only for real semanal records; derived mensal rows cannot be cleared here
  const hasExisting = !!(_existingEsc && !_existingEsc.id.startsWith("mensal_"))
  const isDerived   = !!(_existingEsc?.id?.startsWith("mensal_"))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horário Semanal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Escala semana {format(weekDays[0],"d",{locale:ptBR})} a {format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={()=>setReferenceDate(d=>addDays(d,-7))}><ChevronLeft className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm" onClick={()=>setReferenceDate(new Date())}>Esta semana</Button>
          <Button variant="outline" size="icon" onClick={()=>setReferenceDate(d=>addDays(d,7))}><ChevronRight className="h-4 w-4"/></Button>
          <div className="w-px h-6 bg-gray-200 mx-1"/>

          {/* Limpar */}
          <Button variant="outline" size="sm" disabled={loading||escalas.length===0}
            onClick={()=>setShowClear(true)} className="gap-2 border-red-300 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4"/> Limpar
          </Button>

          {/* Reverter */}
          {undoState && (
            <Button variant="outline" size="sm" disabled={undoing} onClick={reverter}
              className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-50">
              {undoing ? <Loader2 className="h-4 w-4 animate-spin"/> : <RotateCcw className="h-4 w-4"/>}
              Reverter
            </Button>
          )}

          <div className="w-px h-6 bg-gray-200 mx-1"/>
          <Button onClick={printEscala} disabled={loading} variant="outline" size="sm" className="gap-2"><Printer className="h-4 w-4"/> Imprimir</Button>
          <Button onClick={exportPDF} disabled={loading} variant="outline" size="sm" className="gap-2"><FileDown className="h-4 w-4"/> Baixar PDF</Button>
          <Button onClick={shareWA} disabled={loading || sharingWA} variant="outline" size="sm" className="gap-2 border-green-400 text-green-700 hover:bg-green-50">
            {sharingWA ? <Loader className="h-4 w-4 animate-spin"/> : <MessageCircle className="h-4 w-4"/>}
            {sharingWA ? "Enviando..." : "WhatsApp"}
          </Button>
        </div>
      </div>

      {/* Info banner — auto-derivation */}
      <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <Info className="h-4 w-4 mt-0.5 shrink-0"/>
        <span>
          A escala é preenchida automaticamente com base na escala mensal e na configuração de postos por turno.
          Configure em <strong>Turnos → Postos</strong>. Clique em qualquer célula para fazer override manual.
        </span>
      </div>

      {/* Table */}
      {loading ? <div className="text-center text-gray-400 py-16 text-sm">A carregar...</div> : (
        <div style={{ background: "white", borderRadius: "8px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginBottom: "16px" }}>
          <div style={{ textAlign: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: "3px solid #1A3A4A" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1A3A4A", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>📅 Escala Semanal</h2>
            <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Semana {format(weekDays[0],"d",{locale:ptBR})} a {format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table ref={tableRef} style={{ borderCollapse: "collapse", width: "100%", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#D9D9D9", minWidth: "70px" }}/>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>RX URG</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>TAC 1</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>TAC 2</th>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#FFD700" }}>Exames Complementares</th>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#FFD700" }}>RX</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>Transportes<br/>INT/URG</th>
                </tr>
                <tr style={{ background: "#f0f0f0" }}>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#D9D9D9" }}/>
                  {(["RX_URG","TAC1","TAC2","EXAM1","EXAM2"] as PostoKey[]).map(k=><th key={k} style={{ ...thBase, backgroundColor: "#FFD700" }}/>)}
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>SALA 6 BB</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>SALA 7 EXT</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}/>
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day,di)=>{
                const dateStr=format(day,"yyyy-MM-dd")
                return TURNOS.map((turno,ti)=>(
                  <tr key={`${di}-${turno}`}>
                    {ti===0&&<td rowSpan={3} style={{ border:B,backgroundColor:DAY_BG[di%DAY_BG.length],textAlign:"center",fontWeight:700,fontSize:"11px",padding:"4px 6px",minWidth:"42px",verticalAlign:"middle" }}>
                      <div style={{fontSize:"14px"}}>{format(day,"d")}</div>
                      <div>{DIAS_PT[di]}</div>
                    </td>}
                    <td style={{ border:B,backgroundColor:SHIFT_BG[turno],textAlign:"center",fontWeight:700,fontSize:"12px",padding:"2px 6px",minWidth:"26px" }}>{turno}</td>
                    {POSTOS.map(p=>{
                      const opera = postoOpera(p.key as PostoKey, turno, dateStr)
                      const esc=opera ? getEscala(dateStr,turno,p.key) : undefined
                      const derived = esc?.id?.startsWith("mensal_")
                      const cellName = getCellName(esc)
                      const temRestr = esc?.auxiliar_id
                        ? auxTemRestricao(esc.auxiliar_id, p.key, turno, dateStr)
                        : false
                      return(
                        <td key={p.key}
                          onClick={opera ? ()=>openCell(dateStr,turno,p.key as PostoKey) : undefined}
                          title={!opera
                            ? "Posto não opera neste turno/dia"
                            : cellName
                              ? `${cellName}${derived?" (da escala mensal)":""}${temRestr?" ⚠️ restrição ativa":""}`
                              : "Clique para atribuir"}
                          style={{ ...cellBase,
                            backgroundColor: !opera ? "#E5E7EB" : p.bg,
                            opacity: !opera ? 0.5 : derived ? 0.75 : 1,
                            fontStyle: derived ? "italic" : "normal",
                            cursor: !opera ? "not-allowed" : "pointer",
                            border: temRestr ? "2px solid #EF4444" : B }}
                          onMouseEnter={opera ? e=>(e.currentTarget.style.filter="brightness(0.91)") : undefined}
                          onMouseLeave={opera ? e=>(e.currentTarget.style.filter="brightness(1)") : undefined}>
                          {opera ? cellName : "—"}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })}
            </tbody>
          </table>
            </div>
          </div>
      )}

      {/* Modals */}
      {showClear && <ConfirmModal
        title={`Limpar escala ${format(weekDays[0],"d/M")} – ${format(weekDays[6],"d/M")}?`}
        body="Todos os dados desta semana serão apagados. Pode reverter com 'Reverter'."
        onConfirm={limparSemana} onCancel={()=>setShowClear(false)}/>}

      {/* Cell dialog */}
      {dialogOpen && (
        <div role="dialog" aria-modal="true"
          style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.42)",backdropFilter:"blur(3px)",animation:"fadeIn 0.15s ease" }}
          onClick={e=>{ if(e.target===e.currentTarget) closeDialog() }}>
          <div style={{ background:"#FFFFFF",borderRadius:"16px",width:"100%",maxWidth:"400px",margin:"16px",boxShadow:"0 25px 60px rgba(0,0,0,0.18)",overflow:"hidden",animation:"slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ height:"5px",backgroundColor:accentBg }}/>
            <div style={{ padding:"20px 20px 14px",borderBottom:"1px solid #F0F0F0" }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
                <div>
                  <div style={{ display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"4px" }}>
                    <span style={{ width:"10px",height:"10px",borderRadius:"3px",backgroundColor:accentBg,display:"inline-block",flexShrink:0 }}/>
                    {posto?.label}
                  </div>
                  <div style={{ fontSize:"18px",fontWeight:700,color:"#1A1A2E",lineHeight:1.2 }}>{dayLabel} — Turno {selCell?.turnoLetra}</div>
                  <div style={{ fontSize:"12px",color:"#888",marginTop:"4px" }}>{selCell?.tipo==="doutor" ? "Selecione o doutor(a)" : "Selecione o auxiliar"}</div>
                </div>
                <button onClick={closeDialog} style={{ background:"#F4F4F4",border:"none",borderRadius:"50%",width:"32px",height:"32px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <X size={15} color="#555"/>
                </button>
              </div>
              {/* Search */}
              <div style={{ marginTop:"14px",display:"flex",alignItems:"center",gap:"8px",background:"#F7F8FA",borderRadius:"10px",padding:"8px 12px",border:"1.5px solid #EBEBEB",transition:"border-color 0.15s" }}
                onFocusCapture={e=>(e.currentTarget.style.borderColor=accentBg)} onBlurCapture={e=>(e.currentTarget.style.borderColor="#EBEBEB")}>
                <Search size={14} color="#999" style={{ flexShrink:0 }}/>
                <input ref={searchRef} type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder={`Pesquisar ${selCell?.tipo==="doutor"?"doutor(a)":"auxiliar"}…`}
                  style={{ border:"none",background:"transparent",outline:"none",fontSize:"13px",width:"100%",color:"#1A1A2E" }}/>
                {search && <button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}><X size={13} color="#AAA"/></button>}
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight:"300px",overflowY:"auto",padding:"8px" }}>
              {filtered.length===0 ? (
                <div style={{ padding:"32px 16px",textAlign:"center",fontSize:"13px",color:"#AAA" }}>
                  {personList.length===0 ? `Nenhum ${selCell?.tipo==="doutor"?"doutor":"auxiliar"} cadastrado.` : "Nenhum resultado."}
                </div>
              ) : filtered.map(p=>{
                const isSel=selPersonId===p.id
                const pRestr = selCell
                  ? auxTemRestricao(p.id, selCell.posto, selCell.turnoLetra, selCell.data)
                  : false
                return(
                  <button key={p.id} onClick={()=>setSelPersonId(isSel?"":p.id)}
                    style={{ width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"9px 12px",borderRadius:"10px",border:"none",cursor:"pointer",textAlign:"left",backgroundColor:isSel?"#EBF4F8":"transparent",transition:"background-color 0.12s" }}
                    onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.backgroundColor="#F7F8FA" }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.backgroundColor="transparent" }}>
                    <div style={{ width:"36px",height:"36px",borderRadius:"10px",backgroundColor:isSel?accentBg:"#E8EEF2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,flexShrink:0,color:isSel?"#FFFFFF":"#5A7080",transition:"all 0.12s" }}>{getInitials(p.nome)}</div>
                    <span style={{ flex:1,fontSize:"13px",fontWeight:isSel?600:500,color:isSel?"#1A3A4A":"#333" }}>{p.nome}</span>
                    {pRestr && <span title="Restrição ativa para este posto/turno" style={{ fontSize:"14px" }}>⚠️</span>}
                    {isSel && <div style={{ width:"22px",height:"22px",borderRadius:"50%",backgroundColor:accentBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Check size={13} color="#FFF" strokeWidth={2.5}/></div>}
                  </button>
                )
              })}
            </div>

            {/* Restriction warning banner */}
            {selPersonId && selCell && auxTemRestricao(selPersonId, selCell.posto, selCell.turnoLetra, selCell.data) && (
              <div style={{ margin:"0 20px 0",padding:"8px 12px",background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:"8px",fontSize:"12px",color:"#92400E",display:"flex",alignItems:"center",gap:"6px" }}>
                ⚠️ Esta pessoa tem uma restrição ativa para este posto ou turno.
              </div>
            )}

            {/* Footer */}
            <div style={{ padding:"14px 20px 20px",borderTop:"1px solid #F0F0F0",display:"flex",gap:"8px",justifyContent:"flex-end",alignItems:"center",flexWrap:"wrap" }}>
              {isDerived && (
                <span style={{ marginRight:"auto",fontSize:"11px",color:"#9CA3AF",fontStyle:"italic" }}>Da escala mensal — override manual possível</span>
              )}
              {hasExisting && (
                <button onClick={clearEscala} style={{ marginRight:"auto",background:"none",border:"1.5px solid #FFCDD2",borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"#E57373",transition:"all 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#FFF5F5";e.currentTarget.style.borderColor="#E57373"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="#FFCDD2"}}>Limpar</button>
              )}
              <button onClick={closeDialog} style={{ background:"#F4F4F4",border:"none",borderRadius:"8px",padding:"7px 16px",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"#555",transition:"background 0.12s" }}
                onMouseEnter={e=>(e.currentTarget.style.background="#E8E8E8")} onMouseLeave={e=>(e.currentTarget.style.background="#F4F4F4")}>Cancelar</button>
              <button onClick={saveEscala} disabled={saving||!selPersonId}
                style={{ background:selPersonId?"#1A3A4A":"#CCC",border:"none",borderRadius:"8px",padding:"7px 20px",cursor:selPersonId?"pointer":"not-allowed",fontSize:"12px",fontWeight:700,color:"#FFF",letterSpacing:"0.02em",transition:"background 0.12s" }}
                onMouseEnter={e=>{if(selPersonId)e.currentTarget.style.background="#2A5A74"}}
                onMouseLeave={e=>{if(selPersonId)e.currentTarget.style.background="#1A3A4A"}}>
                {saving ? "A guardar…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        
        /* Melhorias visuais da tabela */
        table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        table tbody tr:hover {
          background-color: #f0f0f0;
        }
        table tbody td {
          transition: background-color 0.2s ease;
        }
        table tbody td:hover {
          filter: brightness(0.95);
        }
        
        /* Toast notification */
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideOutDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        
        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          z-index: 9999;
          font-size: 14px;
          font-weight: 500;
          animation: slideInUp 0.3s ease;
        }
        
        .toast.hidden {
          animation: slideOutDown 0.3s ease;
        }
      `}</style>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast" style={{ animation: showToast ? "slideInUp 0.3s ease" : "slideOutDown 0.3s ease" }}>
          {toastMsg}
        </div>
      )}
    </>
  )
}
