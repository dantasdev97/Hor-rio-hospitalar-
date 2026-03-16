import { useEffect, useMemo, useRef, useState } from "react"
import { format, getDaysInMonth, startOfMonth, getDay, parseISO, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, X, Check,
  FileDown, MessageCircle, Wand2, Trash2, RotateCcw, Loader2, Printer, Loader,
} from "lucide-react"
import html2pdf from "html2pdf.js"
import html2canvas from "html2canvas"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Turno } from "@/types"
import { Button } from "@/components/ui/button"
import { AuxDrawer } from "@/components/AuxDrawer"

interface EscalaRow {
  id: string; data: string; auxiliar_id: string | null
  turno_id: string | null; codigo_especial: string | null
}
interface UndoState { inserted: EscalaRow[]; deleted: EscalaRow[] }

const SPECIAL = [
  { code: "D",   label: "Descanso",            bg: "#D1D5DB", text: "#374151" },
  { code: "F",   label: "Folga",               bg: "#F3F4F6", text: "#6B7280" },
  { code: "Fe",  label: "Comp. Feriado",       bg: "#86EFAC", text: "#14532D" },
  { code: "FAA", label: "Férias Ano Anterior", bg: "#FCA5A5", text: "#7F1D1D" },
  { code: "L",   label: "Licença",             bg: "#DDD6FE", text: "#4C1D95" },
  { code: "Aci", label: "Acidente Trabalho",   bg: "#A5F3FC", text: "#164E63" },
] as const

const HORARIOS_KEY = "cfg_horarios"
const DEFAULT_CFG = { bloquearTurnosConsecutivos: true, horasDescansMinimas: 11, maxTurnosNoturnos: 2, maxTurnosMes: 22, maxTurnosNoturnosMes: 4 }
function loadCfg() {
  try { const r = localStorage.getItem(HORARIOS_KEY); return r ? { ...DEFAULT_CFG, ...JSON.parse(r) } : DEFAULT_CFG }
  catch { return DEFAULT_CFG }
}

// ─── Helpers de turno noturno e descanso ─────────────────────────────────────
function isNoturnoTurno(t: Turno): boolean {
  // Usa horario_inicio se disponível; senão recai no nome
  if (t.horario_inicio && t.horario_inicio !== "00:00") return t.horario_inicio >= "20:00"
  return t.nome.toUpperCase().startsWith("N")
}
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
// Calcula horas de descanso entre fim do turno anterior (dia d) e início do turno seguinte (dia d+1)
function restHoursBetween(prev: { horario_inicio: string; horario_fim: string }, nextInicio: string): number {
  if (!prev.horario_inicio || !prev.horario_fim || !nextInicio) return 24
  const prevStart = toMinutes(prev.horario_inicio)
  const prevEnd   = toMinutes(prev.horario_fim)
  const nextStart = toMinutes(nextInicio)
  // Turno noturno cruza meia-noite (fim < inicio), ex: N 21:00–07:00
  // O fim já está no dia d+1, portanto o gap é simples
  const crossesDay = prevEnd < prevStart
  const gapMin = crossesDay ? nextStart - prevEnd : nextStart + 1440 - prevEnd
  return gapMin / 60
}

function deriveTurnoColor(nome: string): { bg: string; text: string } {
  const n = nome.toUpperCase()
  if (n.startsWith("MT"))  return { bg: "#BAE6FD", text: "#0C4A6E" }
  if (n.startsWith("TAC") || n.startsWith("ECO") || n.startsWith("RX")) return { bg: "#D9F99D", text: "#365314" }
  if (n.startsWith("T"))   return { bg: "#FECDD3", text: "#881337" }
  if (n.startsWith("M"))   return { bg: "#FEF08A", text: "#713F12" }
  if (n.startsWith("N"))   return { bg: "#C7D2FE", text: "#3730A3" }
  return { bg: "#F3F4F6", text: "#374151" }
}
function getTurnoColor(t: Turno) { return t.cor ? { bg: t.cor, text: "#111827" } : deriveTurnoColor(t.nome) }
function getSpecialColor(code: string) { const s = SPECIAL.find(s => s.code === code); return s ? { bg: s.bg, text: s.text } : { bg: "#F3F4F6", text: "#374151" } }

const DIAS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
function isWeekend(year: number, month: number, day: number) { const d = getDay(new Date(year,month,day)); return d===0||d===6 }
function thS(bg: string, extra: React.CSSProperties={}): React.CSSProperties { return { border:"1px solid #999",padding:"4px 3px",background:bg,fontSize:10,fontWeight:700,textAlign:"center",whiteSpace:"nowrap",...extra } }
function tdS(bg: string, extra: React.CSSProperties={}): React.CSSProperties { return { border:"1px solid #CCC",padding:"3px 5px",background:bg,fontSize:10,textAlign:"center",...extra } }

// ─── Generating Modal ─────────────────────────────────────────────────────────
function GenModal({ total, current, log }: { total: number; current: number; log: string[] }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(6px)",animation:"mFadeIn 0.2s ease" }} />
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:101,width:380,maxWidth:"90vw",background:"#fff",borderRadius:20,boxShadow:"0 32px 80px rgba(0,0,0,0.32)",animation:"mSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden" }}>
        <div style={{ height:4,background:"linear-gradient(90deg,#4F46E5,#7C3AED,#06B6D4)" }} />
        <div style={{ padding:"2rem",textAlign:"center" }}>
          <div style={{ width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#4F46E5,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.25rem",boxShadow:"0 8px 24px rgba(79,70,229,0.4)",animation:"iconPulse 1.4s ease-in-out infinite" }}>
            <Wand2 size={28} color="white" />
          </div>
          <h3 style={{ fontSize:17,fontWeight:800,margin:"0 0 0.25rem",color:"#111" }}>A gerar a escala mensal…</h3>
          <p style={{ fontSize:13,color:"#6B7280",margin:0 }}>Respeitando restrições e regras de horário</p>
          {total > 0 && (
            <div style={{ marginTop:"1.5rem" }}>
              <div style={{ background:"#E5E7EB",borderRadius:99,height:7,overflow:"hidden",marginBottom:8 }}>
                <div style={{ background:"linear-gradient(90deg,#4F46E5,#7C3AED)",height:"100%",width:`${pct}%`,transition:"width 0.3s ease",borderRadius:99 }} />
              </div>
              <p style={{ fontSize:12,color:"#9CA3AF" }}>{current} / {total} entradas · {pct}%</p>
            </div>
          )}
          {log.length > 0 && (
            <div style={{ marginTop:"1rem",background:"#F8FAFC",borderRadius:10,padding:"0.625rem 0.75rem",textAlign:"left",border:"1px solid #E5E7EB",maxHeight:110,overflowY:"auto" }}>
              {log.map((e,i)=>(
                <div key={i} style={{ fontSize:11,color:i===log.length-1?"#4F46E5":"#6B7280",fontWeight:i===log.length-1?600:400,padding:"1px 0",animation:i===log.length-1?"logSlide 0.2s ease":"none" }}>{e}</div>
              ))}
            </div>
          )}
          {total === 0 && (
            <div style={{ marginTop:"1rem",display:"flex",justifyContent:"center",gap:5 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"#4F46E5",opacity:0.3,animation:`dotBounce 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes iconPulse{0%,100%{transform:scale(1);box-shadow:0 8px 24px rgba(79,70,229,0.4)}50%{transform:scale(1.06);box-shadow:0 12px 32px rgba(79,70,229,0.6)}}
        @keyframes dotBounce{0%,80%,100%{transform:scale(0.7);opacity:0.3}40%{transform:scale(1.2);opacity:1}}
        @keyframes logSlide{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
    </>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onCancel }: { title:string;body:string;onConfirm:()=>void;onCancel:()=>void }) {
  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)",animation:"mFadeIn 0.15s ease" }} onClick={onCancel} />
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:101,width:360,maxWidth:"90vw",background:"#fff",borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",padding:"1.75rem 1.5rem",animation:"mSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width:48,height:48,borderRadius:"50%",background:"#FEF2F2",border:"1px solid #FECACA",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem" }}>
          <Trash2 size={22} color="#EF4444" />
        </div>
        <h3 style={{ textAlign:"center",fontSize:16,fontWeight:700,margin:"0 0 0.5rem",color:"#111" }}>{title}</h3>
        <p style={{ textAlign:"center",fontSize:13,color:"#6B7280",margin:"0 0 1.5rem" }}>{body}</p>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"0.65rem",background:"#F4F4F5",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"0.65rem",background:"#EF4444",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",boxShadow:"0 2px 8px rgba(239,68,68,0.35)" }}>Limpar mesmo</button>
        </div>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EscalaMensal() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares]   = useState<Auxiliar[]>([])
  const [turnos, setTurnos]           = useState<Turno[]>([])
  const [escalas, setEscalas]         = useState<EscalaRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 })
  const [genLog, setGenLog]           = useState<string[]>([])
  const [flashCells, setFlashCells]   = useState<Set<string>>(new Set())
  const [undoState, setUndoState]     = useState<UndoState | null>(null)
  const [undoing, setUndoing]         = useState(false)
  const [showClear, setShowClear]     = useState(false)
  const [sharingWA, setSharingWA]     = useState(false)
  const [showToast, setShowToast]     = useState(false)
  const [toastMsg, setToastMsg]       = useState("")
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [selCell, setSelCell]         = useState<{ auxiliarId: string; data: string } | null>(null)
  const [selTurnoId, setSelTurnoId]   = useState<string | null>(null)
  const [selCodigo, setSelCodigo]     = useState<string | null>(null)
  const [search, setSearch]           = useState("")
  const [drawerAux, setDrawerAux]     = useState<Auxiliar | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const year        = currentDate.getFullYear()
  const month       = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(new Date(year, month))
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Sort by numero_mecanografico numerically
  const sortedAuxiliares = useMemo(() =>
    [...auxiliares].sort((a, b) => {
      const na = parseInt(a.numero_mecanografico ?? "999999", 10) || 999999
      const nb = parseInt(b.numero_mecanografico ?? "999999", 10) || 999999
      return na - nb
    }), [auxiliares])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)
    const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd")
    const endDate   = format(new Date(year, month, daysInMonth), "yyyy-MM-dd")
    const [{ data: a },{ data: t },{ data: e }] = await Promise.all([
      supabase.from("auxiliares").select("*"),
      supabase.from("turnos").select("*").order("nome"),
      supabase.from("escalas").select("id,data,auxiliar_id,turno_id,codigo_especial")
        .eq("tipo_escala","mensal").gte("data",startDate).lte("data",endDate),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setEscalas(e ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [year, month])

  // ── Realtime: detecta mudanças vindas da escala semanal (reverse sync) ─────
  useEffect(() => {
    const channel = supabase
      .channel(`mensal-live-${year}-${month}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'escalas' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: string; tipo_escala?: string } | undefined
          if (row?.tipo_escala === 'mensal' && row?.data) {
            const d = new Date(row.data + 'T12:00:00')
            if (d.getFullYear() === year && d.getMonth() === month) fetchAll()
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [year, month])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function mkDateStr(day: number) { return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` }
  function getEscala(auxId: string, day: number) { return escalas.find(e => e.auxiliar_id===auxId && e.data===mkDateStr(day)) }
  function getCellDisplay(e: EscalaRow | undefined) {
    if (!e) return null
    if (e.codigo_especial) return { code: e.codigo_especial, ...getSpecialColor(e.codigo_especial) }
    if (e.turno_id) { const t = turnos.find(t=>t.id===e.turno_id); if (t) return { code: t.nome, ...getTurnoColor(t) } }
    return null
  }
  function flashCell(auxId: string, data: string) {
    const k = `${auxId}_${data}`
    setFlashCells(p => new Set([...p,k]))
    setTimeout(() => setFlashCells(p => { const n=new Set(p); n.delete(k); return n }), 900)
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openCell(auxId: string, day: number) {
    const d = mkDateStr(day)
    const ex = escalas.find(e => e.auxiliar_id===auxId && e.data===d)
    setSelCell({ auxiliarId: auxId, data: d })
    setSelTurnoId(ex?.turno_id ?? null)
    setSelCodigo(ex?.codigo_especial ?? null)
    setSearch("")
    setDialogOpen(true)
    setTimeout(() => searchRef.current?.focus(), 80)
  }
  function closeDialog() { setDialogOpen(false); setSearch("") }
  function selectTurno(id: string) { setSelTurnoId(id); setSelCodigo(null) }
  function selectCodigo(code: string) { setSelCodigo(code); setSelTurnoId(null) }

  async function saveEscala() {
    if (!selCell || (!selTurnoId && !selCodigo)) return
    setSaving(true)
    const ex = escalas.find(e => e.auxiliar_id===selCell.auxiliarId && e.data===selCell.data)
    const payload = { auxiliar_id:selCell.auxiliarId, data:selCell.data, tipo_escala:"mensal", status:"alocado", turno_id:selTurnoId??null, codigo_especial:selCodigo??null }
    let savedId: string|null = null
    if (ex) { const {error} = await supabase.from("escalas").update(payload).eq("id",ex.id); if (!error) savedId=ex.id }
    else { const {data:rows,error} = await supabase.from("escalas").insert(payload).select("id"); if (!error&&rows?.length) savedId=rows[0].id }
    setSaving(false); closeDialog()
    if (savedId) {
      const nr: EscalaRow = { id:savedId, data:selCell.data, auxiliar_id:selCell.auxiliarId, turno_id:selTurnoId, codigo_especial:selCodigo }
      setEscalas(p => ex ? p.map(e=>e.id===ex.id?nr:e) : [...p,nr])
      flashCell(selCell.auxiliarId, selCell.data)
    } else fetchAll()
  }

  async function clearEscala() {
    if (!selCell) return
    const ex = escalas.find(e => e.auxiliar_id===selCell.auxiliarId && e.data===selCell.data)
    closeDialog()
    if (ex) { setEscalas(p=>p.filter(e=>e.id!==ex.id)); const {error}=await supabase.from("escalas").delete().eq("id",ex.id); if (error) fetchAll() }
  }

  // ── Gerar Escala Mensal ───────────────────────────────────────────────────
  async function gerarEscalaMensal() {
    if (turnos.length === 0) return
    const cfg = loadCfg()
    const startOfMonthStr = `${year}-${String(month+1).padStart(2,"0")}-01`
    const endOfMonthStr   = `${year}-${String(month+1).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`

    const [{ data: restricoes }, { data: ausenciasMes }] = await Promise.all([
      supabase.from("restricoes").select("auxiliar_id,turno_id,data_inicio,data_fim"),
      supabase.from("ausencias").select("auxiliar_id,codigo,data_inicio,data_fim")
        .lte("data_inicio", endOfMonthStr)
        .gte("data_fim",    startOfMonthStr),
    ])

    setGenerating(true)
    setGenProgress({ current:0, total:0 })
    setGenLog([])

    // Build restriction map: auxId → Set<turnoId>
    // Falha 8: filtrar restrições temporárias pelo período do mês
    const turnoRestr: Record<string, Set<string>> = {}
    for (const r of (restricoes ?? [])) {
      if (!r.turno_id) continue
      if (r.data_fim   && r.data_fim   < startOfMonthStr) continue // expirada
      if (r.data_inicio && r.data_inicio > endOfMonthStr)  continue // futura
      if (!turnoRestr[r.auxiliar_id]) turnoRestr[r.auxiliar_id] = new Set()
      turnoRestr[r.auxiliar_id].add(r.turno_id)
    }

    // Build ausências blocked map: `${auxId}_${dateStr}` → codigoEspecial
    const ausBlocked = new Map<string, string>()
    for (const aus of (ausenciasMes ?? [])) {
      let cur = parseISO(aus.data_inicio)
      const fim = parseISO(aus.data_fim)
      while (cur <= fim) {
        ausBlocked.set(`${aus.auxiliar_id}_${format(cur,"yyyy-MM-dd")}`, aus.codigo)
        cur = addDays(cur, 1)
      }
    }

    // Falha 6: deteção de noturno por horario_inicio em vez do nome
    const noturnoIds = new Set(turnos.filter(isNoturnoTurno).map(t => t.id))

    type WKey = string
    const wkCount: Record<string, Record<WKey,number>> = {}
    const wkNoc:   Record<string, Record<WKey,number>> = {}

    // Pre-count existing escalas
    for (const e of escalas) {
      if (!e.auxiliar_id || !e.turno_id) continue
      const d = parseInt(e.data.substring(8,10))
      const wk: WKey = `${e.data.substring(0,7)}-w${Math.floor((d-1)/7)}`
      if (!wkCount[e.auxiliar_id]) wkCount[e.auxiliar_id]={}
      wkCount[e.auxiliar_id][wk] = (wkCount[e.auxiliar_id][wk]??0)+1
      if (noturnoIds.has(e.turno_id)) {
        if (!wkNoc[e.auxiliar_id]) wkNoc[e.auxiliar_id]={}
        wkNoc[e.auxiliar_id][wk] = (wkNoc[e.auxiliar_id][wk]??0)+1
        wkNoc[e.auxiliar_id]["__month__"] = (wkNoc[e.auxiliar_id]["__month__"]??0)+1
      }
    }

    // Monthly count per aux for fair weekend distribution
    const monthCount: Record<string,number> = Object.fromEntries(
      auxiliares.map(a => [a.id, escalas.filter(e=>e.auxiliar_id===a.id&&e.turno_id).length])
    )

    type PayloadRow = { auxiliar_id:string; data:string; tipo_escala:string; status:string; turno_id:string|null; codigo_especial:string|null }
    const payloads: PayloadRow[] = []
    const pending = new Set<string>() // `${auxId}_${dateStr}`

    // Falha 1+2: bloquearTurnosConsecutivos — rastreia turno atribuído por dia por aux
    const existingDayTurno = new Map<string, string>() // `${auxId}_${dateStr}` → turnoId
    for (const e of escalas) {
      if (e.auxiliar_id && e.turno_id) existingDayTurno.set(`${e.auxiliar_id}_${e.data}`, e.turno_id)
    }
    const pendingTurno = new Map<string, string>() // idem para os payloads desta geração

    // Rastrear turnos usados por dia para evitar que 2 auxiliares fiquem no mesmo turno
    const dayTurnoUsed = new Map<string, Set<string>>() // dateStr → Set<turnoId>

    // Pré-planeamento: garantir exatamente 2 auxiliares em noturno por dia
    const dayNocPlan = new Map<string, string[]>() // dateStr → [auxId1, auxId2]
    const auxNocPlanned: Record<string, number> = Object.fromEntries(auxiliares.map(a => [a.id, 0]))
    const nocMensalPlan = (cfg as typeof DEFAULT_CFG).maxTurnosNoturnosMes ?? DEFAULT_CFG.maxTurnosNoturnosMes
    const auxPlanNocDays = new Map<string, Set<number>>() // auxId → Set<dayNum> (days pre-planned for noc)

    for (const d of days) {
      const dateStr = mkDateStr(d)
      const dow = getDay(new Date(year, month, d))
      const planned: string[] = []

      const eligibleForNoc = sortedAuxiliares
        .filter(aux => {
          if ((dow === 0 || dow === 6) && aux.trabalha_fds === false) return false
          if (ausBlocked.has(`${aux.id}_${dateStr}`)) return false
          if (escalas.find(e => e.auxiliar_id === aux.id && e.data === dateStr)) return false
          // Não planear noturno se já planejado noturno no dia anterior (precisa de descanso)
          const prevNocDays = auxPlanNocDays.get(aux.id) ?? new Set<number>()
          if (prevNocDays.has(d - 1) || prevNocDays.has(d - 2)) return false
          const restricted = turnoRestr[aux.id] ?? new Set<string>()
          const available = turnos.filter(t => !restricted.has(t.id))
          if (!wkNoc[aux.id]) wkNoc[aux.id] = {}
          const wk: WKey = `${dateStr.substring(0,7)}-w${Math.floor((d-1)/7)}`
          if ((wkNoc[aux.id][wk] ?? 0) >= cfg.maxTurnosNoturnos) return false
          if ((wkNoc[aux.id]["__month__"] ?? 0) >= nocMensalPlan) return false
          return available.some(t => noturnoIds.has(t.id))
        })
        .sort((a, b) => (auxNocPlanned[a.id] ?? 0) - (auxNocPlanned[b.id] ?? 0))

      for (const aux of eligibleForNoc) {
        if (planned.length >= 2) break
        planned.push(aux.id)
        auxNocPlanned[aux.id] = (auxNocPlanned[aux.id] ?? 0) + 1
        if (!auxPlanNocDays.has(aux.id)) auxPlanNocDays.set(aux.id, new Set())
        auxPlanNocDays.get(aux.id)!.add(d)
      }
      dayNocPlan.set(dateStr, planned)
    }

    // Falha 9: distribuição justa de turnos — conta quantas vezes cada turno foi atribuído a cada aux
    const auxTurnoCount: Record<string, Record<string, number>> = {}

    // Night shift on day d → D on d-1 (rest before), D on d+1, F on d+2
    function addDescansoFolga(auxId: string, d: number) {
      // D before night shift
      if (d > 1) {
        const pd = mkDateStr(d-1); const k0 = `${auxId}_${pd}`
        if (!ausBlocked.has(k0) && !escalas.find(e=>e.auxiliar_id===auxId&&e.data===pd) && !pending.has(k0)) {
          payloads.push({ auxiliar_id:auxId, data:pd, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"D" })
          pending.add(k0)
        }
      }
      // D after night shift
      if (d < daysInMonth) {
        const nd = mkDateStr(d+1); const k1 = `${auxId}_${nd}`
        if (!ausBlocked.has(k1) && !escalas.find(e=>e.auxiliar_id===auxId&&e.data===nd) && !pending.has(k1)) {
          payloads.push({ auxiliar_id:auxId, data:nd, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"D" })
          pending.add(k1)
        }
      }
      // F two days after
      if (d+1 < daysInMonth) {
        const fd = mkDateStr(d+2); const k2 = `${auxId}_${fd}`
        if (!ausBlocked.has(k2) && !escalas.find(e=>e.auxiliar_id===auxId&&e.data===fd) && !pending.has(k2)) {
          payloads.push({ auxiliar_id:auxId, data:fd, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"F" })
          pending.add(k2)
        }
      }
    }

    // ── Todos os dias do mês (Seg–Dom, 24/7) ────────────────────────────────
    for (const aux of sortedAuxiliares) {
      const restricted = turnoRestr[aux.id] ?? new Set<string>()
      const available = turnos.filter(t => !restricted.has(t.id))
      if (available.length === 0) continue

      for (const d of days) {
        const dateStr = mkDateStr(d)
        const dow = getDay(new Date(year, month, d))

        if ((dow === 0 || dow === 6) && aux.trabalha_fds === false) {
          // Preenche fim de semana com Folga para quem não trabalha FDS
          const k = `${aux.id}_${dateStr}`
          if (!ausBlocked.has(k) && !escalas.find(e=>e.auxiliar_id===aux.id&&e.data===dateStr) && !pending.has(k)) {
            payloads.push({ auxiliar_id:aux.id, data:dateStr, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"F" })
            pending.add(k)
          }
          continue
        }

        // Bloqueia dias de ausência registados
        if (ausBlocked.has(`${aux.id}_${dateStr}`)) continue

        const ex = escalas.find(e => e.auxiliar_id===aux.id && e.data===dateStr)
        if (ex) continue
        if (pending.has(`${aux.id}_${dateStr}`)) continue

        // Limite mensal atingido → preenche com Folga
        const mensal = (cfg as typeof DEFAULT_CFG).maxTurnosMes ?? DEFAULT_CFG.maxTurnosMes
        if ((monthCount[aux.id]??0) >= mensal) {
          const k = `${aux.id}_${dateStr}`
          if (!ausBlocked.has(k) && !pending.has(k)) {
            payloads.push({ auxiliar_id:aux.id, data:dateStr, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"F" })
            pending.add(k)
          }
          continue
        }

        const wk: WKey = `${dateStr.substring(0,7)}-w${Math.floor((d-1)/7)}`
        if (!wkNoc[aux.id]) wkNoc[aux.id]={}
        const nocMensal = (cfg as typeof DEFAULT_CFG).maxTurnosNoturnosMes ?? DEFAULT_CFG.maxTurnosNoturnosMes
        const nocExceeded = (wkNoc[aux.id][wk]??0) >= cfg.maxTurnosNoturnos
        const nocMonthlyExceeded = (wkNoc[aux.id]["__month__"]??0) >= nocMensal
        const candidates = (nocExceeded || nocMonthlyExceeded) ? available.filter(t=>!noturnoIds.has(t.id)) : available
        if (candidates.length === 0) continue

        // Falha 1+2: bloquear turno se descanso mínimo não respeitado após turno anterior
        let filteredCandidates = candidates
        if (cfg.bloquearTurnosConsecutivos && d > 1) {
          const prevKey = `${aux.id}_${mkDateStr(d - 1)}`
          const prevTurnoId = existingDayTurno.get(prevKey) ?? pendingTurno.get(prevKey)
          if (prevTurnoId) {
            const prevTurno = turnos.find(t => t.id === prevTurnoId)
            if (prevTurno) {
              filteredCandidates = filteredCandidates.filter(t =>
                restHoursBetween(prevTurno, t.horario_inicio) >= cfg.horasDescansMinimas
              )
            }
          }
        }
        // Fallback: se todos filtrados, usa candidatos originais (cobertura > restrição)
        if (filteredCandidates.length === 0) filteredCandidates = candidates

        // Sem turno duplicado no mesmo dia: filtrar turnos já usados por outros auxiliares
        if (!dayTurnoUsed.has(dateStr)) dayTurnoUsed.set(dateStr, new Set())
        const usedOnDay = dayTurnoUsed.get(dateStr)!
        let pickedCandidates = filteredCandidates.filter(t => !usedOnDay.has(t.id))
        if (pickedCandidates.length === 0) pickedCandidates = filteredCandidates // fallback

        // Regra 2 noturnos por dia
        const nocPlanned = dayNocPlan.get(dateStr) ?? []
        const mustBeNoc = nocPlanned.includes(aux.id)
        const dayNocAssigned = [...usedOnDay].filter(tId => noturnoIds.has(tId)).length
        if (mustBeNoc) {
          const nocCands = pickedCandidates.filter(t => noturnoIds.has(t.id))
          if (nocCands.length > 0) pickedCandidates = nocCands
        } else if (dayNocAssigned >= 2) {
          // Já tem 2 noturnos hoje: bloquear noturno para este auxiliar
          const nonNocCands = pickedCandidates.filter(t => !noturnoIds.has(t.id))
          if (nonNocCands.length > 0) pickedCandidates = nonNocCands
        } else {
          // Noturno ainda não atingiu 2: preferir não-noturno para deixar slot para os planeados
          const nonNocCands = pickedCandidates.filter(t => !noturnoIds.has(t.id))
          if (nonNocCands.length > 0) pickedCandidates = nonNocCands
        }

        // Falha 9: seleção justa — turno com menor contagem para este aux
        if (!auxTurnoCount[aux.id]) auxTurnoCount[aux.id] = {}
        const picked = pickedCandidates.sort((a, b) =>
          (auxTurnoCount[aux.id][a.id] ?? 0) - (auxTurnoCount[aux.id][b.id] ?? 0)
        )[0]

        payloads.push({ auxiliar_id:aux.id, data:dateStr, tipo_escala:"mensal", status:"alocado", turno_id:picked.id, codigo_especial:null })
        pending.add(`${aux.id}_${dateStr}`)
        pendingTurno.set(`${aux.id}_${dateStr}`, picked.id)
        usedOnDay.add(picked.id)
        auxTurnoCount[aux.id][picked.id] = (auxTurnoCount[aux.id][picked.id] ?? 0) + 1
        monthCount[aux.id] = (monthCount[aux.id]??0)+1
        if (noturnoIds.has(picked.id)) {
          wkNoc[aux.id][wk] = (wkNoc[aux.id][wk]??0)+1
          wkNoc[aux.id]["__month__"] = (wkNoc[aux.id]["__month__"]??0)+1
          addDescansoFolga(aux.id, d)
        }
      }

      // Varredura final: preenche qualquer célula ainda em branco com Folga
      for (const d of days) {
        const dateStr = mkDateStr(d)
        const k = `${aux.id}_${dateStr}`
        if (!ausBlocked.has(k) && !escalas.find(e=>e.auxiliar_id===aux.id&&e.data===dateStr) && !pending.has(k)) {
          payloads.push({ auxiliar_id:aux.id, data:dateStr, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"F" })
          pending.add(k)
        }
      }
    }

    setGenProgress({ current:0, total:payloads.length })
    if (payloads.length === 0) { setGenerating(false); return }

    const inserted: EscalaRow[] = []
    const BATCH = 25
    for (let i=0; i<payloads.length; i+=BATCH) {
      const batch = payloads.slice(i, i+BATCH)
      const { data:rows, error } = await supabase.from("escalas").insert(batch).select("id,data,auxiliar_id,turno_id,codigo_especial")
      if (!error && rows) {
        const typed = rows as EscalaRow[]
        inserted.push(...typed)
        typed.forEach(r => { if (r.auxiliar_id) flashCell(r.auxiliar_id, r.data) })
        setEscalas(p => [...p, ...typed])
        setGenProgress(p => ({ ...p, current: Math.min(p.total, p.current+batch.length) }))
        const entries = typed.slice(0,3).map(r => {
          const aName = auxiliares.find(a=>a.id===r.auxiliar_id)?.nome?.split(" ")[0] ?? "—"
          const tName = r.turno_id ? (turnos.find(t=>t.id===r.turno_id)?.nome ?? "—") : (r.codigo_especial ?? "—")
          const m = parseInt(r.data.substring(5,7))-1
          return `✓ ${aName} · ${r.data.substring(8,10)} ${MESES[m]} · ${tName}`
        })
        setGenLog(p => [...p, ...entries].slice(-6))
      }
      await new Promise(r => setTimeout(r, 70))
    }
    setUndoState({ inserted, deleted:[] })
    setGenerating(false)
  }

  // ── Limpar ────────────────────────────────────────────────────────────────
  const ABSENCE_CODES = new Set(["Fe", "FAA", "L", "Aci"])
  async function limparMensal() {
    setShowClear(false)
    const toDelete = escalas.filter(e => !e.codigo_especial || !ABSENCE_CODES.has(e.codigo_especial))
    const toKeep   = escalas.filter(e => e.codigo_especial && ABSENCE_CODES.has(e.codigo_especial))
    if (!toDelete.length) return
    setUndoState({ inserted:[], deleted:toDelete })
    setEscalas(toKeep)
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
      const { data:rows } = await supabase.from("escalas").insert(payloads).select("id,data,auxiliar_id,turno_id,codigo_especial")
      if (rows) setEscalas(p => [...p, ...(rows as EscalaRow[])])
    }
    setUndoState(null); setUndoing(false)
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  function generateTableHTML() {
    const mesAno = format(currentDate,"MMMM yyyy",{locale:ptBR})
    const hdrs = days.map(d=>{const dw=getDay(new Date(year,month,d));const we=dw===0||dw===6;return`<th style="border:1px solid #999;padding:4px 3px;background:${we?"#B5BCC7":"#D9D9D9"};font-size:9px;font-weight:700;text-align:center;min-width:26px;">${d}<br/><span style="font-weight:400;font-size:8px;color:${we?"#EF4444":"#555"}">${DIAS_PT[dw]}</span></th>`}).join("")
    let rows=""
    for(const aux of sortedAuxiliares){
      rows+=`<tr><td style="border:1px solid #999;padding:4px 4px;font-size:9px;white-space:nowrap;font-weight:700;">${aux.numero_mecanografico??""}</td><td style="border:1px solid #999;padding:4px 6px;font-size:9px;white-space:nowrap;">${aux.nome}</td>`
      for(const d of days){const e=getEscala(aux.id,d);const di=getCellDisplay(e);const we=isWeekend(year,month,d);rows+=`<td style="border:1px solid #999;padding:4px 2px;background:${di?di.bg:we?"#E5E7EB":"#FFFFFF"};font-size:9px;font-weight:700;text-align:center;">${di?.code??""}</td>`}
      rows+="</tr>"
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Escala Mensal - ${mesAno.toUpperCase()}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 15mm;
      background: #fff;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    
    h2 {
      font-size: 14px;
      margin: 0 0 15px 0;
      text-align: center;
      font-weight: 700;
      color: #111827;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      font-family: Arial, sans-serif;
    }
    
    th, td {
      border: 1px solid #999;
      padding: 4px 3px;
      text-align: center;
    }
    
    th {
      background: #D9D9D9;
      font-size: 8px;
      font-weight: 700;
      padding: 4px 2px;
    }
    
    /* Primeira coluna (Nº) */
    th:first-child,
    td:first-child {
      min-width: 40px;
      font-weight: 700;
    }
    
    /* Segunda coluna (Nome) */
    th:nth-child(2),
    td:nth-child(2) {
      min-width: 130px;
      text-align: left;
      padding-left: 8px;
    }
    
    /* Colunas de dias */
    thead th:nth-child(n+3) {
      padding: 3px 2px;
      font-size: 8px;
      min-width: 26px;
      width: 26px;
    }
    
    tbody td:nth-child(n+3) {
      padding: 3px 2px;
      font-size: 8px;
      min-width: 26px;
      width: 26px;
    }
    
    /* Finals de semana em cabeçalho */
    tbody tr:nth-child(odd) {
      background: #FFFFFF;
    }
    
    tbody tr:nth-child(even) {
      background: #FAFAFA;
    }
    
    @media print {
      body {
        margin: 10mm;
        padding: 0;
      }
      .container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>ESCALA MENSAL – ${mesAno.toUpperCase()}</h2>
    <table>
      <thead>
        <tr>
          <th style="min-width:40px;">Nº</th>
          <th style="min-width:130px;text-align:left;">Nome</th>
          ${hdrs}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`
  }

  function exportPDF() {
    const element = document.createElement("div")
    element.innerHTML = generateTableHTML()
    
    const opt: any = {
      margin: 10,
      filename: `Escala_Mensal_${format(currentDate,"yyyy-MM")}.pdf`,
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

  function printEscala() {
    const mesAno = format(currentDate,"MMMM yyyy",{locale:ptBR})
    const html = generateTableHTML()
    const w=window.open("","_blank","width=1300,height=750")
    if(!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(()=>w.print(),400)
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
            window.open("https://chat.whatsapp.com/L3sgtM9ZkP046xVbkBi5gH?mode=gi_t", "_blank")
          }, 500)
        } catch (clipboardErr) {
          console.error("Erro ao copiar para clipboard:", clipboardErr)
          // Fallback: fazer download se clipboard falhar
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `Escala_Mensal_${format(currentDate,"yyyy-MM")}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          setToastMsg("✅ Imagem baixada! Compartilhe manualmente no WhatsApp")
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
          setSharingWA(false)
          
          setTimeout(() => {
            window.open("https://chat.whatsapp.com/L3sgtM9ZkP046xVbkBi5gH?mode=gi_t", "_blank")
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
      window.open("https://chat.whatsapp.com/L3sgtM9ZkP046xVbkBi5gH?mode=gi_t", "_blank")
    }
  }

  const selectedAux    = auxiliares.find(a => a.id===selCell?.auxiliarId)
  const existingInCell = selCell ? escalas.find(e => e.auxiliar_id===selCell.auxiliarId && e.data===selCell.data) : undefined
  const filteredTurnos = turnos.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))
  const hasSelection   = !!(selTurnoId || selCodigo)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horário Mensal</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{format(currentDate,"MMMM yyyy",{locale:ptBR})}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={()=>setCurrentDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}><ChevronLeft className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm" onClick={()=>setCurrentDate(new Date())}>Este mês</Button>
          <Button variant="outline" size="icon" onClick={()=>setCurrentDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}><ChevronRight className="h-4 w-4"/></Button>
          <div className="w-px h-6 bg-gray-200 mx-1"/>

          {/* Gerar */}
          <Button size="sm" disabled={generating||loading||turnos.length===0} onClick={gerarEscalaMensal} className="gap-2"
            style={{ background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"white",boxShadow:generating?"none":"0 2px 10px rgba(79,70,229,0.4)" }}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}
            {generating ? "A gerar…" : "Gerar Escala"}
          </Button>

          {/* Limpar */}
          <Button variant="outline" size="sm" disabled={generating||loading||escalas.length===0}
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
          <Button variant="outline" size="sm" onClick={printEscala} disabled={loading} className="gap-2"><Printer className="h-4 w-4"/> Imprimir</Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={loading} className="gap-2"><FileDown className="h-4 w-4"/> Baixar PDF</Button>
          <Button variant="outline" size="sm" onClick={shareWA} disabled={loading || sharingWA} className="gap-2 border-green-400 text-green-700 hover:bg-green-50">
            {sharingWA ? <Loader className="h-4 w-4 animate-spin"/> : <MessageCircle className="h-4 w-4"/>}
            {sharingWA ? "Enviando..." : "WhatsApp"}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="text-center text-gray-400 py-16 text-sm">A carregar...</div> : (
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table ref={tableRef} className="border-collapse text-xs" style={{ minWidth:`${196+days.length*30}px` }}>
            <thead>
              <tr>
                <th style={thS("#D9D9D9",{minWidth:44,position:"sticky",left:0,zIndex:20})}>Nº</th>
                <th style={thS("#D9D9D9",{minWidth:150,position:"sticky",left:44,zIndex:20,textAlign:"left",paddingLeft:8})}>Nome</th>
                {days.map(d=>{const dw=getDay(new Date(year,month,d));const we=dw===0||dw===6;return(
                  <th key={d} style={thS(we?"#B5BCC7":"#D9D9D9",{width:30,minWidth:30,padding:"3px 2px"})}>
                    <div style={{fontSize:10}}>{d}</div>
                    <div style={{fontWeight:400,fontSize:8,color:we?"#DC2626":"#6B7280"}}>{DIAS_PT[dw]}</div>
                  </th>
                )})}
              </tr>
            </thead>
            <tbody>
              {sortedAuxiliares.map((aux,idx)=>{
                const rowBg = idx%2===0?"#FFFFFF":"#FAFAFA"
                return(
                  <tr key={aux.id}>
                    <td style={tdS("#EBEBEB",{position:"sticky",left:0,zIndex:10,fontWeight:700,fontSize:10,background:"#EBEBEB"})}>{aux.numero_mecanografico??""}</td>
                    <td style={tdS("#EBEBEB",{position:"sticky",left:44,zIndex:10,whiteSpace:"nowrap",fontWeight:600,fontSize:10,textAlign:"left",paddingLeft:8,background:"#EBEBEB"})}>
                      <button onClick={()=>setDrawerAux(aux)} style={{background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:10,color:"#111827",padding:0,textAlign:"left"}} onMouseEnter={e=>(e.currentTarget.style.color="#2563EB")} onMouseLeave={e=>(e.currentTarget.style.color="#111827")}>{aux.nome}</button>
                    </td>
                    {days.map(d=>{
                      const e=getEscala(aux.id,d); const di=getCellDisplay(e)
                      const we=isWeekend(year,month,d)
                      const bg=di?di.bg:we?"#E5E7EB":rowBg
                      const fl=flashCells.has(`${aux.id}_${mkDateStr(d)}`)
                      return(
                        <td key={d} onClick={()=>openCell(aux.id,d)} title={di?.code??""}
                          style={{ border:"1px solid #CCC",padding:"2px 0",textAlign:"center",cursor:"pointer",background:bg,color:di?di.text:"#374151",fontWeight:di?700:400,fontSize:10,minWidth:30,userSelect:"none",transition:"filter 0.1s",animation:fl?"cellFlash 0.8s ease":"none" }}
                          onMouseEnter={ev=>(ev.currentTarget.style.filter="brightness(0.88)")}
                          onMouseLeave={ev=>(ev.currentTarget.style.filter="brightness(1)")}>
                          {di?.code??""}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {sortedAuxiliares.length===0&&<tr><td colSpan={days.length+2} style={{textAlign:"center",padding:32,color:"#9CA3AF",fontSize:13}}>Nenhum auxiliar cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {!loading&&<div className="mt-3 flex flex-wrap gap-2">
        {SPECIAL.map(s=><span key={s.code} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border" style={{background:s.bg,color:s.text,borderColor:s.bg}}><strong>{s.code}</strong> — {s.label}</span>)}
      </div>}

      {/* Modals */}
      {generating && <GenModal total={genProgress.total} current={genProgress.current} log={genLog}/>}
      {showClear && <ConfirmModal title={`Limpar ${format(currentDate,"MMMM yyyy",{locale:ptBR})}?`} body="Todos os dados da escala deste mês serão apagados. Pode reverter com 'Reverter'." onConfirm={limparMensal} onCancel={()=>setShowClear(false)}/>}

      {/* Cell Modal */}
      {dialogOpen && selCell && <>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,backdropFilter:"blur(3px)",animation:"mFadeIn 0.15s ease"}} onClick={closeDialog}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#fff",borderRadius:18,zIndex:51,width:460,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.28),0 0 0 1px rgba(0,0,0,0.06)",animation:"mSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>
          {/* header */}
          <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #F0F0F0"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:"#111"}}>{selectedAux?.nome}</div>
                <div style={{fontSize:12,color:"#9CA3AF",marginTop:3,fontWeight:500}}>{selCell&&format(parseISO(selCell.data),"EEEE, d 'de' MMMM yyyy",{locale:ptBR})}</div>
              </div>
              <button onClick={closeDialog} style={{background:"#F4F4F5",border:"none",cursor:"pointer",padding:"6px",borderRadius:8,color:"#71717A",lineHeight:0}}><X size={16}/></button>
            </div>
            {(()=>{const di=getCellDisplay(existingInCell);if(!di)return null;return<div style={{marginTop:10,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:"#9CA3AF"}}>Atual:</span><span style={{background:di.bg,color:di.text,fontWeight:700,fontSize:12,padding:"2px 10px",borderRadius:6}}>{di.code}</span></div>})()}
          </div>
          {/* body */}
          <div style={{overflowY:"auto",padding:"16px 22px",flex:1}}>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Ocorrências</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
                {SPECIAL.map(s=>{const sel=selCodigo===s.code;return(
                  <button key={s.code} onClick={()=>selectCodigo(s.code)} style={{background:sel?s.bg:"#FAFAFA",color:sel?s.text:"#374151",border:`2px solid ${sel?s.text+"80":"#E5E7EB"}`,borderRadius:10,padding:"9px 6px",cursor:"pointer",fontSize:11,fontWeight:sel?700:500,textAlign:"center",transition:"all 0.12s",outline:"none",boxShadow:sel?`0 0 0 2px ${s.bg}`:"none"}}>
                    <div style={{fontSize:16,fontWeight:800,lineHeight:1}}>{s.code}</div>
                    <div style={{fontSize:9,marginTop:4,opacity:0.75,lineHeight:1.2}}>{s.label}</div>
                    {sel&&<Check size={11} style={{margin:"4px auto 0"}}/>}
                  </button>
                )})}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"#F0F0F0"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#D1D5DB",textTransform:"uppercase",letterSpacing:"0.07em"}}>Turnos</span>
              <div style={{flex:1,height:1,background:"#F0F0F0"}}/>
            </div>
            <div style={{marginBottom:10}}>
              <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar turno..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #E5E7EB",borderRadius:9,padding:"8px 12px",fontSize:13,outline:"none",background:"#FAFAFA",color:"#111",transition:"border-color 0.15s"}}
                onFocus={ev=>(ev.target.style.borderColor="#6366F1")} onBlur={ev=>(ev.target.style.borderColor="#E5E7EB")}/>
            </div>
            {filteredTurnos.length===0
              ? <p style={{textAlign:"center",color:"#9CA3AF",fontSize:12,padding:"14px 0"}}>{turnos.length===0?"Nenhum turno cadastrado.":"Sem resultados."}</p>
              : <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7}}>
                  {filteredTurnos.map(t=>{const {bg,text}=getTurnoColor(t);const sel=selTurnoId===t.id;return(
                    <button key={t.id} onClick={()=>selectTurno(t.id)} style={{background:sel?bg:"#FAFAFA",color:sel?text:"#374151",border:`2px solid ${sel?text+"60":"#E5E7EB"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",fontSize:11,fontWeight:sel?700:500,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.12s",outline:"none",boxShadow:sel?`0 0 0 2px ${bg}`:"none"}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,lineHeight:1}}>{t.nome}</div>
                        <div style={{fontSize:10,opacity:0.65,marginTop:3}}>{t.horario_inicio.slice(0,5)} – {t.horario_fim.slice(0,5)}</div>
                      </div>
                      {sel&&<Check size={15}/>}
                    </button>
                  )})}
                </div>}
          </div>
          {/* footer */}
          <div style={{padding:"14px 22px",borderTop:"1px solid #F0F0F0",display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={clearEscala} disabled={!existingInCell} style={{background:existingInCell?"#FEF2F2":"#F9FAFB",color:existingInCell?"#DC2626":"#D1D5DB",border:`1.5px solid ${existingInCell?"#FECACA":"#E5E7EB"}`,borderRadius:9,padding:"8px 16px",cursor:existingInCell?"pointer":"not-allowed",fontSize:13,fontWeight:600}}>Limpar</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={closeDialog} style={{background:"#F4F4F5",color:"#374151",border:"none",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>Cancelar</button>
              <button onClick={saveEscala} disabled={saving||!hasSelection} style={{background:saving||!hasSelection?"#E5E7EB":"#4F46E5",color:saving||!hasSelection?"#9CA3AF":"#FFFFFF",border:"none",borderRadius:9,padding:"8px 20px",cursor:saving||!hasSelection?"not-allowed":"pointer",fontSize:13,fontWeight:700,boxShadow:!saving&&hasSelection?"0 2px 8px rgba(79,70,229,0.35)":"none"}}>
                {saving?"A guardar...":"Guardar"}
              </button>
            </div>
          </div>
        </div>
      </>}

      <style>{`
        @keyframes mFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes mSlideUp{from{opacity:0;transform:translate(-50%,-46%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes cellFlash{0%{filter:brightness(1.9) saturate(1.5)}50%{filter:brightness(1.3) saturate(1.2)}100%{filter:brightness(1) saturate(1)}}
        
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

      {/* Aux Drawer */}
      {drawerAux && (
        <AuxDrawer
          aux={drawerAux}
          onClose={() => setDrawerAux(null)}
          onUpdated={updated => {
            setAuxiliares(p => p.map(a => a.id === updated.id ? updated : a))
            setDrawerAux(updated)
          }}
          onAusenciaSaved={() => fetchAll()}
        />
      )}
    </div>
  )
}
