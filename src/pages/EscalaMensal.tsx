import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format, getDaysInMonth, startOfMonth, getDay, parseISO, addDays, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, X, Check,
  FileDown, MessageCircle, Wand2, Trash2, RotateCcw, Loader2, Printer, Loader, CalendarDays,
  AlertCircle, MoreVertical, ArrowLeftRight,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import html2canvas from "html2canvas"
import { supabase } from "@/lib/supabaseClient"
import { useConfig } from "@/contexts/ConfigContext"
import type { Auxiliar, Turno } from "@/types"
import { Button } from "@/components/ui/button"
import { AuxDrawer } from "@/components/AuxDrawer"
import AlertPanel from "@/components/alerts/AlertPanel"
import { classificarCobertura, TURNO_FULL, URG_POSTOS, NON_URG_POSTOS } from "@/components/alerts/alertTypes"
import type { AlertaUnificado, CellRef } from "@/components/alerts/alertTypes"

interface EscalaRow {
  id: string; data: string; auxiliar_id: string | null
  turno_id: string | null; codigo_especial: string | null
}
interface UndoState { inserted: EscalaRow[]; deleted: EscalaRow[] }
// Registos da escala semanal (para mostrar na mensal quando não há registo mensal)
interface SemanaisRow { id: string; data: string; auxiliar_id: string | null; turno_letra: string; posto: string }

const SPECIAL = [
  { code: "D",   label: "Descanso",            bg: "#D1D5DB", text: "#374151" },
  { code: "F",   label: "Folga",               bg: "#F3F4F6", text: "#6B7280" },
  { code: "Fe",  label: "Comp. Feriado",       bg: "#86EFAC", text: "#14532D" },
  { code: "FAA", label: "Férias Ano Anterior", bg: "#FCA5A5", text: "#7F1D1D" },
  { code: "L",   label: "Licença",             bg: "#DDD6FE", text: "#4C1D95" },
  { code: "Aci", label: "Acidente Trabalho",   bg: "#A5F3FC", text: "#164E63" },
] as const


// ─── Helpers de turno noturno e descanso ─────────────────────────────────────
function isNoturnoTurno(t: Turno): boolean {
  // Normaliza para HH:MM (Supabase pode devolver HH:MM:SS)
  const inicio = (t.horario_inicio || "").slice(0, 5)
  if (inicio && inicio !== "00:00") return inicio >= "20:00"
  return t.nome.toUpperCase().startsWith("N")
}
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
// Calcula duração de um turno em horas (suporta turnos nocturnos onde fim < início)
function calcShiftHours(t: Turno): number {
  if (!t.horario_inicio || !t.horario_fim) return 8 // fallback
  const startMin = toMinutes(t.horario_inicio)
  const endMin   = toMinutes(t.horario_fim)
  let diff = endMin - startMin
  if (diff <= 0) diff += 1440 // turno nocturno cruza meia-noite
  return diff / 60
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
  const navigate = useNavigate()
  const { horarios } = useConfig()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares]   = useState<Auxiliar[]>([])
  const [turnos, setTurnos]           = useState<Turno[]>([])
  const [escalas, setEscalas]         = useState<EscalaRow[]>([])
  const [escalasSemanais, setEscalasSemanais] = useState<SemanaisRow[]>([])
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
  const [substitutoModalOpen, setSubstitutoModalOpen] = useState(false)
  const [substitutoAuxId, setSubstitutoAuxId] = useState<string | null>(null)
  const [substitutoData, setSubstitutoData] = useState<string | null>(null)
  const [alertasModalOpen, setAlertasModalOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [blinkCell, setBlinkCell] = useState<CellRef | null>(null)
  const [blinkIsUrg, setBlinkIsUrg] = useState(true)
  const searchRef    = useRef<HTMLInputElement>(null)
  const tableRef     = useRef<HTMLTableElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // ── Swap Mensal state ──────────────────────────────────────────────────────
  type SwapMensalCell = { auxId: string; data: string; turnoId: string; turnoNome: string }
  const [swapMensal, setSwapMensal]               = useState(false)
  const [swapMensalSource, setSwapMensalSource]   = useState<SwapMensalCell | null>(null)
  const [swapMensalTargetAuxId, setSwapMensalTargetAuxId] = useState<string | null>(null)
  const [swapMensalTargetShift, setSwapMensalTargetShift] = useState<SwapMensalCell | null>(null)
  const [swapMensalConfirmOpen, setSwapMensalConfirmOpen] = useState(false)
  const [swappingMensal, setSwappingMensal]       = useState(false)
  const [ctrlHeldMensal, setCtrlHeldMensal]       = useState(false)
  const [ctrlSelMensal, setCtrlSelMensal]         = useState<SwapMensalCell | null>(null)
  const [swappedCellsMensal, setSwappedCellsMensal] = useState<Set<string>>(new Set())

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

  // Group auxiliaries by equipa (sorted by mecanografico within each group)
  const EQUIPAS_ORDER = ['Equipa 1', 'Equipa 2', 'Equipa Transportes'] as const
  const groupedAuxiliares = useMemo(() => {
    const groups = EQUIPAS_ORDER.map(equipa => ({
      equipa,
      membros: sortedAuxiliares.filter(a => a.equipa === equipa)
    })).filter(g => g.membros.length > 0)
    const semEquipa = sortedAuxiliares.filter(a => !a.equipa)
    if (semEquipa.length > 0) groups.push({ equipa: "Sem Equipa" as typeof EQUIPAS_ORDER[number], membros: semEquipa })
    return groups
  }, [sortedAuxiliares])

  // Alertas reactivos — recalcula sempre que escalas/auxiliares/turnos/semanais mudam
  const alertas = useMemo(() => loading ? [] : calcularAlertas(), [escalas, escalasSemanais, auxiliares, turnos, year, month, loading])

  function handleEyeClick(cellRef: CellRef, isUrg: boolean) {
    setBlinkCell(cellRef)
    setBlinkIsUrg(isUrg)
    setTimeout(() => setBlinkCell(null), 3000)
  }

  // Click-outside para fechar export menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)
    const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd")
    const endDate   = format(new Date(year, month, daysInMonth), "yyyy-MM-dd")
    const [{ data: a },{ data: t },{ data: e },{ data: s }] = await Promise.all([
      supabase.from("auxiliares").select("*"),
      supabase.from("turnos").select("*").order("nome"),
      supabase.from("escalas").select("id,data,auxiliar_id,turno_id,codigo_especial")
        .eq("tipo_escala","mensal").gte("data",startDate).lte("data",endDate),
      supabase.from("escalas").select("id,data,auxiliar_id,turno_letra,posto")
        .eq("tipo_escala","semanal").gte("data",startDate).lte("data",endDate)
        .not("auxiliar_id","is",null).not("turno_letra","is",null),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setEscalas(e ?? [])
    setEscalasSemanais(s ?? [])
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
          if ((row?.tipo_escala === 'mensal' || row?.tipo_escala === 'semanal') && row?.data) {
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
  // Devolve o 1.º registo semanal para este aux+dia (quando não há registo mensal)
  function getSemanaisForAux(auxId: string, day: number) {
    return escalasSemanais.filter(s => s.auxiliar_id === auxId && s.data === mkDateStr(day))
  }
  const LETRA_COLOR: Record<string, { bg: string; text: string }> = {
    N: { bg: "#C7D2FE", text: "#3730A3" },
    M: { bg: "#FEF08A", text: "#713F12" },
    T: { bg: "#FECDD3", text: "#881337" },
  }
  // Dado turno_letra e posto (da escala semanal), tenta encontrar o turno registado correspondente
  function resolverTurnoDeSemanal(letra: string, posto: string) {
    // 1.º: match exacto por letra + posto
    let t = turnos.find(t => getTurnoLetraMensal(t) === letra && (t.postos ?? []).includes(posto))
    if (t) return t
    // 2.º: qualquer turno cujo nome começa pela letra (N5, M1, T2, etc.)
    t = turnos.find(t => t.nome.toUpperCase().startsWith(letra.toUpperCase()))
    if (t) return t
    // 3.º: qualquer turno com a letra correta (fallback final)
    return turnos.find(t => getTurnoLetraMensal(t) === letra) ?? null
  }

  function getCellDisplay(e: EscalaRow | undefined, auxId?: string, day?: number) {
    if (!e) {
      // Derivar do semanal quando não há registo mensal
      if (auxId && day !== undefined) {
        const sems = getSemanaisForAux(auxId, day)
        if (sems.length > 0) {
          const letra = sems[0].turno_letra
          const t = resolverTurnoDeSemanal(letra, sems[0].posto)
          if (t) return { code: t.nome, ...getTurnoColor(t), isSemanal: true }
          return { code: letra, ...(LETRA_COLOR[letra] ?? { bg: "#F3F4F6", text: "#374151" }), isSemanal: true }
        }
      }
      return null
    }
    if (e.codigo_especial) return { code: e.codigo_especial, ...getSpecialColor(e.codigo_especial), isSemanal: false }
    if (e.turno_id) { const t = turnos.find(t=>t.id===e.turno_id); if (t) return { code: t.nome, ...getTurnoColor(t), isSemanal: false } }
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
    // Pre-select turno from existing mensal record, or from semanal-derived entry
    let preSelTurnoId: string | null = ex?.turno_id ?? null
    if (!ex) {
      const sems = getSemanaisForAux(auxId, day)
      if (sems.length > 0) {
        const t = resolverTurnoDeSemanal(sems[0].turno_letra, sems[0].posto)
        if (t) preSelTurnoId = t.id
      }
    }
    setSelTurnoId(preSelTurnoId)
    setSelCodigo(ex?.codigo_especial ?? null)
    setSearch("")
    setDialogOpen(true)
    setTimeout(() => searchRef.current?.focus(), 80)
  }
  function closeDialog() { setDialogOpen(false); setSearch("") }
  function selectTurno(id: string) { setSelTurnoId(id); setSelCodigo(null) }
  function selectCodigo(code: string) { setSelCodigo(code); setSelTurnoId(null) }

  // Função para abrir modal de substituição
  function handleAlertAction(auxId: string, dia: number) {
    const dataStr = mkDateStr(dia)
    setSubstitutoAuxId(auxId)
    setSubstitutoData(dataStr)
    setSubstitutoModalOpen(true)
  }

  // Buscar auxiliares disponíveis para substituição num dia específico
  function getAuxiliaresDisponiveisParaSubstituir(data: string, excludeAuxId: string) {
    const aux_com_info = auxiliares
      .filter(a => a.id !== excludeAuxId && a.disponivel !== false)
      .map(a => {
        // Contar horas atribuídas ao auxiliar
        const auxEscalas = escalas.filter(e => e.auxiliar_id === a.id && e.turno_id)
        let totalHoras = 0
        for (const e of auxEscalas) {
          const t = turnos.find(t => t.id === e.turno_id)
          if (t) totalHoras += calcShiftHours(t)
        }
        totalHoras = Math.round(totalHoras * 10) / 10

        // Verificar se já tem atribuição no dia
        const jaTemNodia = escalas.some(e => e.auxiliar_id === a.id && e.data === data && e.turno_id)

        return {
          id: a.id,
          nome: a.nome,
          numero_mecanografico: a.numero_mecanografico ?? "",
          totalHoras,
          turnos_mes: auxEscalas.length,
          jaTemNodia,
          disponivel: !jaTemNodia && totalHoras < 160,
        }
      })
      .sort((a, b) => {
        // Priorizar: disponíveis sem atribuição no dia, com menos horas
        if (a.jaTemNodia === b.jaTemNodia) return a.totalHoras - b.totalHoras
        return a.jaTemNodia ? 1 : -1
      })

    return aux_com_info
  }

  function navegarParaSemanal(aux: Auxiliar) {
    // Encontra o primeiro dia com atribuição deste auxiliar no mês
    const auxEscalas = escalas.filter(e => e.auxiliar_id === aux.id && e.turno_id)
    const firstDay = auxEscalas.length > 0
      ? auxEscalas.map(e => e.data).sort()[0]
      : mkDateStr(1)
    const weekDate = startOfWeek(parseISO(firstDay), { weekStartsOn: 1 })
    const weekStr = format(weekDate, "yyyy-MM-dd")
    navigate(`/escala-semanal?auxiliarId=${aux.id}&auxiliarNome=${encodeURIComponent(aux.nome)}&week=${weekStr}`)
  }

  async function saveEscala() {
    if (!selCell || (!selTurnoId && !selCodigo)) return
    setSaving(true)
    const ex = escalas.find(e => e.auxiliar_id===selCell.auxiliarId && e.data===selCell.data)
    const updatePayload = { turno_id:selTurnoId??null, codigo_especial:selCodigo??null }
    const insertPayload = { auxiliar_id:selCell.auxiliarId, data:selCell.data, tipo_escala:"mensal", status:"alocado", ...updatePayload }
    let savedId: string|null = null
    if (ex) { const {error} = await supabase.from("escalas").update(updatePayload).eq("id",ex.id); if (!error) savedId=ex.id }
    else { const {data:rows,error} = await supabase.from("escalas").insert(insertPayload).select("id"); if (!error&&rows?.length) savedId=rows[0].id }
    // Capturar dados para toast ANTES de fechar o diálogo
    const auxNome = auxiliares.find(a => a.id === selCell.auxiliarId)?.nome ?? "Auxiliar"
    const turnoNome = selTurnoId ? (turnos.find(t => t.id === selTurnoId)?.nome ?? "") : ""
    const codigoNome = selCodigo ? (SPECIAL.find(s => s.code === selCodigo)?.label ?? selCodigo) : ""
    const dataFormatada = format(parseISO(selCell.data), "d/M", { locale: ptBR })
    setSaving(false); closeDialog()
    if (savedId) {
      const nr: EscalaRow = { id:savedId, data:selCell.data, auxiliar_id:selCell.auxiliarId, turno_id:selTurnoId, codigo_especial:selCodigo }
      setEscalas(p => ex ? p.map(e=>e.id===ex.id?nr:e) : [...p,nr])
      flashCell(selCell.auxiliarId, selCell.data)
      // Toast de sucesso com nome real
      const descricao = turnoNome || codigoNome
      showToastMsg(`✅ ${auxNome} — ${descricao} atribuído em ${dataFormatada}`)
    } else fetchAll()
  }

  async function clearEscala() {
    if (!selCell) return
    const ex = escalas.find(e => e.auxiliar_id===selCell.auxiliarId && e.data===selCell.data)
    const auxNome = auxiliares.find(a => a.id === selCell.auxiliarId)?.nome ?? "Auxiliar"
    const dataFormatada = format(parseISO(selCell.data), "d/M", { locale: ptBR })
    closeDialog()
    if (ex) {
      // Derive turno letra to also clean up semanal entries
      const turnoObj = turnos.find(t => t.id === ex.turno_id)
      const turnoLetra = turnoObj ? getTurnoLetraMensal(turnoObj) : null
      // Optimistic update — remove from both local states immediately
      setEscalas(p => p.filter(e => e.id !== ex.id))
      if (turnoLetra) {
        setEscalasSemanais(p => p.filter(s =>
          !(s.auxiliar_id === selCell.auxiliarId && s.data === selCell.data && s.turno_letra === turnoLetra)
        ))
      }
      // Persist to DB: delete mensal record
      const { error } = await supabase.from("escalas").delete().eq("id", ex.id)
      if (error) { fetchAll(); return }
      // Also delete semanal entries for this aux+date+turnoLetra (manual overrides in EscalaSemanal)
      if (turnoLetra) {
        await supabase.from("escalas")
          .delete()
          .eq("tipo_escala", "semanal")
          .eq("auxiliar_id", selCell.auxiliarId)
          .eq("data", selCell.data)
          .eq("turno_letra", turnoLetra)
      }
      showToastMsg(`Atribuição removida — ${auxNome}, dia ${dataFormatada}`)
    }
  }

  // Helper para mostrar toast
  function showToastMsg(msg: string) {
    setToastMsg(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3500)
  }

  // ── Ctrl key listener (Mensal swap) ───────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Control") setCtrlHeldMensal(true) }
    const up   = (e: KeyboardEvent) => { if (e.key === "Control") { setCtrlHeldMensal(false); setCtrlSelMensal(null) } }
    const blur = () => { setCtrlHeldMensal(false); setCtrlSelMensal(null) }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur) }
  }, [])

  // ── Swap Mensal helpers ────────────────────────────────────────────────────
  function getAuxShiftsForMonth(auxId: string): Array<{ data: string; turnoId: string; turnoNome: string; dayNum: number }> {
    return escalas
      .filter(e => e.auxiliar_id === auxId && e.turno_id)
      .map(e => {
        const t = turnos.find(t => t.id === e.turno_id)
        if (!t) return null
        const dayNum = parseInt(e.data.split("-")[2])
        return { data: e.data, turnoId: e.turno_id!, turnoNome: t.nome, dayNum }
      })
      .filter(Boolean)
      .sort((a, b) => a!.dayNum - b!.dayNum) as Array<{ data: string; turnoId: string; turnoNome: string; dayNum: number }>
  }

  function handleCtrlClickMensal(auxId: string, day: number) {
    const data = mkDateStr(day)
    const esc = escalas.find(e => e.auxiliar_id === auxId && e.data === data)
    if (!esc?.turno_id) return
    const turnoNome = turnos.find(t => t.id === esc.turno_id)?.nome ?? "?"
    const cell: SwapMensalCell = { auxId, data, turnoId: esc.turno_id, turnoNome }
    if (!ctrlSelMensal) {
      setCtrlSelMensal(cell)
    } else {
      if (ctrlSelMensal.auxId === auxId && ctrlSelMensal.data === data) { setCtrlSelMensal(null); return }
      if (ctrlSelMensal.auxId === auxId) { setCtrlSelMensal(null); return }
      setSwapMensalSource(ctrlSelMensal)
      setSwapMensalTargetShift(cell)
      setSwapMensalConfirmOpen(true)
      setCtrlSelMensal(null)
    }
  }

  function openSwapMensal() {
    if (!selCell || !existingInCell?.turno_id) return
    const turnoNome = turnos.find(t => t.id === existingInCell.turno_id)?.nome ?? "?"
    setSwapMensalSource({ auxId: selCell.auxiliarId, data: selCell.data, turnoId: existingInCell.turno_id, turnoNome })
    setSwapMensalTargetAuxId(null)
    setSwapMensalTargetShift(null)
    setSwapMensal(true)
    closeDialog()
  }

  async function executeMensalSwap(source: SwapMensalCell, target: SwapMensalCell) {
    setSwappingMensal(true)
    try {
      const escA = escalas.find(e => e.auxiliar_id === source.auxId && e.data === source.data)
      const escB = escalas.find(e => e.auxiliar_id === target.auxId && e.data === target.data)
      if (escA) {
        await supabase.from("escalas").update({ turno_id: target.turnoId, codigo_especial: null }).eq("id", escA.id)
      } else {
        await supabase.from("escalas").insert({ auxiliar_id: source.auxId, data: source.data, tipo_escala: "mensal", status: "alocado", turno_id: target.turnoId, codigo_especial: null })
      }
      if (escB) {
        await supabase.from("escalas").update({ turno_id: source.turnoId, codigo_especial: null }).eq("id", escB.id)
      } else {
        await supabase.from("escalas").insert({ auxiliar_id: target.auxId, data: target.data, tipo_escala: "mensal", status: "alocado", turno_id: source.turnoId, codigo_especial: null })
      }
      // Optimistic local update
      setEscalas(prev => {
        let next = [...prev]
        const idxA = next.findIndex(e => e.auxiliar_id === source.auxId && e.data === source.data)
        const idxB = next.findIndex(e => e.auxiliar_id === target.auxId && e.data === target.data)
        if (idxA >= 0) next[idxA] = { ...next[idxA], turno_id: target.turnoId, codigo_especial: null }
        else next.push({ id: `tmp_${Date.now()}_a`, data: source.data, auxiliar_id: source.auxId, turno_id: target.turnoId, codigo_especial: null })
        if (idxB >= 0) next[idxB] = { ...next[idxB], turno_id: source.turnoId, codigo_especial: null }
        else next.push({ id: `tmp_${Date.now()}_b`, data: target.data, auxiliar_id: target.auxId, turno_id: source.turnoId, codigo_especial: null })
        return next
      })
      const flashKeys = new Set([`${source.auxId}_${source.data}`, `${target.auxId}_${target.data}`])
      setSwappedCellsMensal(flashKeys)
      setTimeout(() => setSwappedCellsMensal(new Set()), 2500)
      const nomeA = auxiliares.find(a => a.id === source.auxId)?.nome?.split(" ")[0] ?? "?"
      const nomeB = auxiliares.find(a => a.id === target.auxId)?.nome?.split(" ")[0] ?? "?"
      showToastMsg(`✅ Troca realizada: ${nomeA} ↔ ${nomeB}`)
    } catch {
      showToastMsg("❌ Erro ao realizar troca.")
      fetchAll()
    } finally {
      setSwappingMensal(false)
      setSwapMensal(false)
      setSwapMensalSource(null)
      setSwapMensalTargetAuxId(null)
      setSwapMensalTargetShift(null)
      setSwapMensalConfirmOpen(false)
    }
  }

  // ── Alertas / Validações ──────────────────────────────────────────────────
  function getTurnoLetraMensal(t: Turno): "M" | "T" | "N" | null {
    if (isNoturnoTurno(t)) return "N"
    const n = t.nome.toUpperCase()
    if (n.startsWith("MT")) return null
    if (n.startsWith("M")) return "M"
    if (n.startsWith("T")) return "T"
    return null
  }

  function calcularAlertas(): AlertaUnificado[] {
    const alertas: AlertaUnificado[] = []
    const cfg = horarios
    const auxMap = new Map(auxiliares.map(a => [a.id, a]))

    const ABSENCE_LABEL: Record<string,string> = {
      L:"licença / baixa médica", Aci:"acidente de trabalho",
      FAA:"férias (ano anterior)", Fe:"folga por feriado", F:"folga", D:"descanso",
    }
    const ABSENCE_TIPOS = ["L","Aci","FAA","Fe"]

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = mkDateStr(d)
      const dow = getDay(new Date(year, month, d))
      const isSun = dow === 0
      const label = `${d}/${month+1} (${DIAS_PT[dow]})`
      const dayAll      = escalas.filter(e => e.data === ds)
      const dayWithTurno = dayAll.filter(e => e.turno_id)
      const daySemanal   = escalasSemanais.filter(s => s.data === ds)

      // ── A) Ausências por código especial ─────────────────────────────────
      for (const e of dayAll) {
        if (!e.codigo_especial || !ABSENCE_TIPOS.includes(e.codigo_especial)) continue
        const aux    = auxMap.get(e.auxiliar_id ?? "")
        const motivo = ABSENCE_LABEL[e.codigo_especial] ?? e.codigo_especial
        const isBaixa = e.codigo_especial === "L" || e.codigo_especial === "Aci"
        alertas.push({
          id: `ausencia_${d}_${e.auxiliar_id}_${e.codigo_especial}`,
          severidade: isBaixa ? "amarelo" : "info",
          categoria: "ausencia",
          isUrg: false,
          mensagem:`${aux?.nome ?? "Auxiliar"} — ${motivo} no dia ${label}`,
          detalhe: isBaixa ? "É necessário garantir cobertura para este posto" : undefined,
          cellRef: { data: ds, turnoLetra: "M", auxiliarId: e.auxiliar_id ?? undefined },
          acao: isBaixa && aux ? { label: "Alocar substituto", auxId: aux.id, dia: d } : undefined,
        })
      }

      // ── B) Cobertura específica por Posto + Turno ──────────────────────────
      const hasAnyActivity = dayWithTurno.length > 0 || daySemanal.length > 0

      if (hasAnyActivity) {
        // Verificar cobertura Turno N (necessário 2: RX_URG + TAC 2)
        const nWorkersMensal = dayWithTurno.filter(e => {
          const t = turnos.find(t => t.id === e.turno_id)
          return t && isNoturnoTurno(t)
        })
        const nWorkersSemanal = daySemanal.filter(s => s.turno_letra === "N" &&
          (s.posto === "TAC2" || s.posto === "RX_URG" || s.posto === "TAC1"))
        const nWorkers = [
          ...nWorkersMensal.map(e => ({ auxId: e.auxiliar_id ?? "", fonte: "mensal" })),
          ...nWorkersSemanal.map(s => ({ auxId: s.auxiliar_id ?? "", fonte: "semanal" })),
        ]
        const nWorkersUniq = nWorkers.filter((w,i) => nWorkers.findIndex(x=>x.auxId===w.auxId)===i)
        if (nWorkersUniq.length === 0) {
          alertas.push({
            id:`cobertura_N0_${d}`, severidade:"vermelho", categoria:"cobertura_urg", isUrg:true,
            mensagem:`${label} — RX URG + TAC 2 — Turno Noite sem auxiliar atribuído`,
            detalhe:"Necessário mínimo 2 auxiliares no Turno Noite",
            cellRef: { data: ds, turnoLetra: "N", posto: "RX_URG" },
          })
        } else if (nWorkersUniq.length === 1) {
          const auxName = auxMap.get(nWorkersUniq[0].auxId)?.nome ?? "?"
          alertas.push({
            id:`cobertura_N1_${d}`, severidade:"vermelho", categoria:"cobertura_urg", isUrg:true,
            mensagem:`${label} — RX URG + TAC 2 — Turno Noite: apenas ${auxName}`,
            detalhe:"Falta 1 auxiliar para cobertura completa (necessário 2)",
            cellRef: { data: ds, turnoLetra: "N", posto: "TAC2" },
          })
        } else if (nWorkersUniq.length > 2) {
          const nNames = nWorkersUniq.map(w => auxMap.get(w.auxId)?.nome ?? "?").join(", ")
          alertas.push({
            id:`cobertura_Nexcess_${d}`, severidade:"amarelo", categoria:"cobertura_geral", isUrg:false,
            mensagem:`${label} — Turno Noite com ${nWorkersUniq.length} auxiliares: ${nNames}`,
            detalhe:"Esperado máximo 2 auxiliares (RX URG + TAC 2)",
            cellRef: { data: ds, turnoLetra: "N" },
          })
        }

        // Verificar cobertura RX_URG, TAC2, TAC1 para Turno M e T
        const POSTOS_M_T = ["RX_URG", "TAC2", "TAC1"]
        for (const posto of POSTOS_M_T) {
          for (const turnoLetra of ["M", "T"] as const) {
            const hasCoverage = dayWithTurno.some(e => {
              const t = turnos.find(t => t.id === e.turno_id)
              return t && getTurnoLetraMensal(t) === turnoLetra && (t.postos ?? []).includes(posto)
            }) || daySemanal.some(s => s.turno_letra === turnoLetra && s.posto === posto)

            if (!hasCoverage) {
              const cls = classificarCobertura(posto, turnoLetra)
              const nomePostoUI = posto === "RX_URG" ? "RX URG" : posto === "TAC1" ? "TAC 1" : "TAC 2"
              alertas.push({
                id:`cobertura_${posto}_${turnoLetra}_${d}`,
                severidade: cls.severidade,
                categoria: cls.categoria,
                isUrg: cls.isUrg,
                mensagem:`${label} — ${nomePostoUI} — Precisa de Auxiliar no Turno ${TURNO_FULL[turnoLetra]}`,
                detalhe:`Posto ${nomePostoUI} sem cobertura no Turno ${TURNO_FULL[turnoLetra]}`,
                cellRef: { data: ds, turnoLetra, posto },
              })
            }
          }
        }

        // Verificar cobertura Eco URG (EXAM1) para Turno M e T (seg–sáb)
        if (!isSun) {
          for (const turnoLetra of ["M", "T"] as const) {
            const hasExamCoverage = dayWithTurno.some(e => {
              const t = turnos.find(t => t.id === e.turno_id)
              return t && getTurnoLetraMensal(t) === turnoLetra && (t.postos ?? []).includes("EXAM1")
            }) || daySemanal.some(s => s.turno_letra === turnoLetra && (s.posto === "EXAM1" || s.posto === "EXAM2"))

            if (!hasExamCoverage) {
              const cls = classificarCobertura("EXAM1", turnoLetra)
              alertas.push({
                id:`cobertura_exam1_${turnoLetra}_${d}`,
                severidade: cls.severidade,
                categoria: cls.categoria,
                isUrg: cls.isUrg,
                mensagem:`${label} — Eco URG — Precisa de Auxiliar no Turno ${TURNO_FULL[turnoLetra]}`,
                detalhe:`Posto EXAM1 sem cobertura no Turno ${TURNO_FULL[turnoLetra]}`,
                cellRef: { data: ds, turnoLetra, posto: "EXAM1" },
              })
            }
          }
        }
      }

      // ── D) Auxiliar escalado ao fim-de-semana sem trabalha_fds ───────────
      if (dow === 0 || dow === 6) {
        for (const e of dayWithTurno) {
          const aux = auxMap.get(e.auxiliar_id ?? "") as (Auxiliar & { trabalha_fds?: boolean }) | undefined
          if (aux && aux.trabalha_fds === false)
            alertas.push({
              id:`cobertura_fds_${d}_${e.auxiliar_id}`, severidade:"vermelho", categoria:"cobertura_urg", isUrg:true,
              mensagem:`${aux.nome} escalado/a ao ${dow===0?"Domingo":"Sábado"} ${label}`,
              detalhe:"Este/a auxiliar não está configurado/a para trabalhar ao fim de semana",
              cellRef: { data: ds, turnoLetra: "M", auxiliarId: e.auxiliar_id ?? undefined },
            })
        }
      }
    }

    // ── E) Descanso pós-noturno violado (N → M ou T no dia seguinte) ──────
    for (const e of escalas) {
      if (!e.turno_id) continue
      const t = turnos.find(t => t.id === e.turno_id)
      if (!t || !isNoturnoTurno(t)) continue
      const nextDs  = format(addDays(parseISO(e.data),1),"yyyy-MM-dd")
      const nextE   = escalas.find(ne => ne.auxiliar_id===e.auxiliar_id && ne.data===nextDs && ne.turno_id)
      if (!nextE) continue
      const nt = turnos.find(t => t.id === nextE.turno_id)
      const nl = nt ? getTurnoLetraMensal(nt) : null
      if (nl === "M" || nl === "T") {
        const aux = auxMap.get(e.auxiliar_id ?? "")
        alertas.push({
          id:`descanso_${e.auxiliar_id}_${e.data}`, severidade:"vermelho", categoria:"descanso", isUrg:true,
          mensagem:`${aux?.nome ?? "?"} — Turno Noite em ${format(parseISO(e.data),"d/M")} seguido de Turno ${TURNO_FULL[nl]} em ${format(parseISO(nextDs),"d/M")}`,
          detalhe:"Descanso mínimo de 11h violado entre turnos consecutivos",
          cellRef: { data: nextDs, turnoLetra: nl, auxiliarId: e.auxiliar_id ?? undefined },
        })
      }
    }

    // ── F) Excessos mensais ───────────────────────────────────────────────
    for (const aux of auxiliares) {
      const nCount = escalas.filter(e => {
        if (e.auxiliar_id !== aux.id || !e.turno_id) return false
        const t = turnos.find(t => t.id === e.turno_id)
        return t && isNoturnoTurno(t)
      }).length
      if (nCount > cfg.maxTurnosNoturnosMes)
        alertas.push({
          id:`excesso_N_${aux.id}`, severidade:"amarelo", categoria:"excesso_mais", isUrg:false,
          mensagem:`${aux.nome} — ${nCount} turnos Noite este mês (limite: ${cfg.maxTurnosNoturnosMes})`,
        })

      const total = escalas.filter(e => e.auxiliar_id === aux.id && e.turno_id).length
      if (total > cfg.maxTurnosMes)
        alertas.push({
          id:`excesso_total_${aux.id}`, severidade:"amarelo", categoria:"excesso_mais", isUrg:false,
          mensagem:`${aux.nome} — ${total} turnos este mês (limite: ${cfg.maxTurnosMes})`,
        })

      // ── F.2) Horas mensais em excesso / défice ──────────────────────────
      const auxEscalas = escalas.filter(e => e.auxiliar_id === aux.id && e.turno_id)
      let totalHoras = 0
      for (const e of auxEscalas) {
        const t = turnos.find(t => t.id === e.turno_id)
        if (t) totalHoras += calcShiftHours(t)
      }
      totalHoras = Math.round(totalHoras * 10) / 10
      if (totalHoras > 160)
        alertas.push({
          id:`excesso_horas_${aux.id}`, severidade:"amarelo", categoria:"excesso_mais", isUrg:false,
          mensagem:`${aux.nome} — ${totalHoras}h atribuídas este mês (máximo recomendado: 160h)`,
          detalhe:`${auxEscalas.length} turnos totalizando ${totalHoras} horas`,
        })
      if (auxEscalas.length > 0 && totalHoras < 80)
        alertas.push({
          id:`deficit_horas_${aux.id}`, severidade:"info", categoria:"excesso_menos", isUrg:false,
          mensagem:`${aux.nome} — apenas ${totalHoras}h atribuídas este mês (mínimo esperado: 80h)`,
        })
    }

    // ── G) Auxiliares sem turnos atribuídos ────────────────────────────────
    for (const aux of auxiliares) {
      if (aux.disponivel === false) continue
      const temTurno = escalas.some(e => e.auxiliar_id === aux.id && e.turno_id)
        || escalasSemanais.some(s => s.auxiliar_id === aux.id)
      if (!temTurno)
        alertas.push({
          id:`sem_turnos_${aux.id}`, severidade:"info", categoria:"ausencia", isUrg:false,
          mensagem:`${aux.nome} não tem turnos atribuídos este mês`,
          detalhe:"Verifique se este/a auxiliar deve ser escalado/a",
        })
    }

    return alertas
  }

  // ── Gerar Escala Mensal ───────────────────────────────────────────────────
  async function gerarEscalaMensal() {
    if (turnos.length === 0) return
    const cfg = horarios
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
    const turnoRestr: Record<string, Set<string>> = {}
    for (const r of (restricoes ?? [])) {
      if (!r.turno_id) continue
      if (r.data_fim   && r.data_fim   < startOfMonthStr) continue
      if (r.data_inicio && r.data_inicio > endOfMonthStr)  continue
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

    const noturnoIds = new Set(turnos.filter(isNoturnoTurno).map(t => t.id))

    // Helper: get shift letter (M/T/N) for a turno
    function getTurnoLetra(t: Turno): "M" | "T" | "N" | null {
      if (isNoturnoTurno(t)) return "N"
      const n = t.nome.toUpperCase()
      if (n.startsWith("MT")) return null
      if (n.startsWith("M")) return "M"
      if (n.startsWith("T")) return "T"
      return null
    }

    // Required worker counts per shift letter for each day-of-week
    // Dom-Dom: RX_URG(M,T,N) + TAC2(M,T,N) + EXAM1(M,T) = N:2, M:3, T:3
    // Seg-Sáb: + TAC1(M,T) + EXAM2(M,T) + SALA6(M) + SALA7(M,T) + TRANSPORT(M,T) = N:2, M:8, T:7
    function getRequiredCounts(dow: number): { N: number; M: number; T: number } {
      if (dow === 0) return { N: 2, M: 3, T: 3 }  // Sunday
      return { N: 2, M: 8, T: 7 }                  // Mon–Sat
    }

    type PayloadRow = { auxiliar_id:string; data:string; tipo_escala:string; status:string; turno_id:string|null; codigo_especial:string|null }
    const payloads: PayloadRow[] = []
    const pending = new Set<string>() // `${auxId}_${dateStr}`

    // Night shift on day d → D on d+1, F on d+2
    function addDescansoFolga(auxId: string, d: number) {
      if (d < daysInMonth) {
        const nd = mkDateStr(d+1); const k1 = `${auxId}_${nd}`
        if (!ausBlocked.has(k1) && !escalas.find(e=>e.auxiliar_id===auxId&&e.data===nd) && !pending.has(k1)) {
          payloads.push({ auxiliar_id:auxId, data:nd, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"D" })
          pending.add(k1)
        }
      }
      if (d+1 < daysInMonth) {
        const fd = mkDateStr(d+2); const k2 = `${auxId}_${fd}`
        if (!ausBlocked.has(k2) && !escalas.find(e=>e.auxiliar_id===auxId&&e.data===fd) && !pending.has(k2)) {
          payloads.push({ auxiliar_id:auxId, data:fd, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:"F" })
          pending.add(k2)
        }
      }
    }

    // ── Coverage-first pre-planning ───────────────────────────────────────────
    // dayShiftPlan: dateStr → Map<auxId, turnoId>
    const dayShiftPlan = new Map<string, Map<string, string>>()
    // auxBlockedDays: auxId → Set<dayNum> — days blocked by post-nocturno rest
    const auxBlockedDays = new Map<string, Set<number>>()
    const auxNocCount: Record<string, number> = Object.fromEntries(sortedAuxiliares.map(a => [a.id, 0]))
    // Fair distribution counter: how many shifts each aux has been pre-planned so far
    const auxPlanCount: Record<string, number> = Object.fromEntries(sortedAuxiliares.map(a => [a.id, 0]))
    const nocMensalPlan = cfg.maxTurnosNoturnosMes

    for (const d of days) {
      const dateStr = mkDateStr(d)
      const dow = getDay(new Date(year, month, d))
      const required = getRequiredCounts(dow)
      const planForDay = new Map<string, string>()
      // Track usage count per turno (allows same turno for multiple aux, e.g. 2×N5)
      const turnoUsageCount = new Map<string, number>()

      for (const letra of ["N", "M", "T"] as const) {
        const needed = required[letra]

        const eligible = sortedAuxiliares
          .filter(aux => {
            if ((dow === 0 || dow === 6) && aux.trabalha_fds === false) return false
            if (ausBlocked.has(`${aux.id}_${dateStr}`)) return false
            if (escalas.find(e => e.auxiliar_id === aux.id && e.data === dateStr)) return false
            if (planForDay.has(aux.id)) return false
            const blocked = auxBlockedDays.get(aux.id) ?? new Set<number>()
            if (blocked.has(d)) return false
            if (letra === "N" && auxNocCount[aux.id] >= nocMensalPlan) return false
            const restricted = turnoRestr[aux.id] ?? new Set<string>()
            // Allow reuse of same turno (e.g. 2 aux on N5): no turno exclusivity check
            return turnos.some(t => getTurnoLetra(t) === letra && !restricted.has(t.id))
          })
          .sort((a, b) => {
            // For nocturno: sort by least nocturno count; for M/T: by least total planned
            if (letra === "N") return (auxNocCount[a.id] ?? 0) - (auxNocCount[b.id] ?? 0)
            return (auxPlanCount[a.id] ?? 0) - (auxPlanCount[b.id] ?? 0)
          })

        let assigned = 0
        for (const aux of eligible) {
          if (assigned >= needed) break
          const restricted = turnoRestr[aux.id] ?? new Set<string>()
          // Prefer turnos with least usage today for fair distribution
          const availTurno = turnos
            .filter(t => getTurnoLetra(t) === letra && !restricted.has(t.id))
            .sort((a, b) => (turnoUsageCount.get(a.id) ?? 0) - (turnoUsageCount.get(b.id) ?? 0))[0]
          if (!availTurno) continue

          planForDay.set(aux.id, availTurno.id)
          turnoUsageCount.set(availTurno.id, (turnoUsageCount.get(availTurno.id) ?? 0) + 1)
          auxPlanCount[aux.id] = (auxPlanCount[aux.id] ?? 0) + 1
          assigned++

          if (letra === "N") {
            auxNocCount[aux.id] = (auxNocCount[aux.id] ?? 0) + 1
            if (!auxBlockedDays.has(aux.id)) auxBlockedDays.set(aux.id, new Set())
            const blocked = auxBlockedDays.get(aux.id)!
            blocked.add(d + 1)  // D after nocturno
            blocked.add(d + 2)  // F two days after
          }
        }
      }

      dayShiftPlan.set(dateStr, planForDay)
    }

    // ── Main loop: assign from plan or give Folga ─────────────────────────────
    for (const aux of sortedAuxiliares) {
      for (const d of days) {
        const dateStr = mkDateStr(d)
        const k = `${aux.id}_${dateStr}`

        if (ausBlocked.has(k)) continue
        if (escalas.find(e => e.auxiliar_id === aux.id && e.data === dateStr)) continue
        if (pending.has(k)) continue

        const dow = getDay(new Date(year, month, d))
        const planForDay = dayShiftPlan.get(dateStr)
        const plannedTurnoId = planForDay?.get(aux.id)

        if (plannedTurnoId) {
          payloads.push({ auxiliar_id:aux.id, data:dateStr, tipo_escala:"mensal", status:"alocado", turno_id:plannedTurnoId, codigo_especial:null })
          pending.add(k)
          if (noturnoIds.has(plannedTurnoId)) addDescansoFolga(aux.id, d)
        } else {
          // Not needed today → Folga (skip entirely for Mon-Fri-only aux; no auto-F)
          if (aux.trabalha_fds === false) continue
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
    // jsPDF + autoTable — PDF vectorial (texto nítido, 1 página, cores exactas)
    type n = number

    function hexToRgb(hex: string): [n,n,n] {
      const h = hex.replace("#","")
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
    }

    const WHT: [n,n,n] = [255,255,255]
    const WKD: [n,n,n] = [229,231,235]   // fim de semana sem dados
    const HDR: [n,n,n] = [217,217,217]   // cabeçalho dias úteis
    const HDW: [n,n,n] = [181,188,199]   // cabeçalho fins de semana
    const BLK: [n,n,n] = [0,0,0]

    // Larguras: Nº=12, Nome=38, dias restantes dividem 227mm por nDias
    const nDias   = days.length
    const dayW    = Math.floor(227 / nDias)         // ex. 31 dias → 7mm; 28 → 8mm
    const totalW  = 12 + 38 + nDias * dayW          // pode ser ≤277mm
    const margin  = Math.max(8, (297 - totalW) / 2) // centrar horizontalmente

    // ── Cabeçalho ────────────────────────────────────────────────────────────
    const mesAno = format(currentDate,"MMMM yyyy",{locale:ptBR})
    const mesAnoF = mesAno[0].toUpperCase() + mesAno.slice(1)

    const dayHeaders = days.map(d => {
      const dw = getDay(new Date(year, month, d))
      const we = dw === 0 || dw === 6
      return {
        content: `${d}\n${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][dw]}`,
        styles: {
          fillColor: we ? HDW : HDR,
          fontStyle: "bold" as const,
          halign: "center" as const,
          fontSize: 7,
          textColor: we ? [180,40,40] as [n,n,n] : BLK,
        }
      }
    })

    const head = [
      // linha 0 — título centrado, full-width
      [{ content: `ESCALA MENSAL — ${mesAnoF.toUpperCase()}`, colSpan: 2 + nDias,
         styles: { fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
                   fillColor:WHT, fontSize:13, textColor:BLK, cellPadding:4 } }],
      // linha 1 — nomes de coluna
      [
        { content:"Nº",   styles:{ fillColor:HDR, fontStyle:"bold" as const, halign:"center" as const, fontSize:8, textColor:BLK } },
        { content:"Nome", styles:{ fillColor:HDR, fontStyle:"bold" as const, halign:"left" as const,   fontSize:8, textColor:BLK } },
        ...dayHeaders,
      ],
    ]

    // ── Corpo ─────────────────────────────────────────────────────────────────
    const body = sortedAuxiliares.map(aux => {
      const numCell = { content: aux.numero_mecanografico ?? "",
        styles: { fontStyle:"bold" as const, halign:"center" as const, fontSize:7.5, textColor:BLK } }
      const nameCell = { content: aux.nome,
        styles: { fontStyle:"normal" as const, halign:"left" as const, fontSize:7.5, textColor:BLK } }

      const dayCells = days.map(d => {
        const e  = getEscala(aux.id, d)
        const di = getCellDisplay(e)
        const dw = getDay(new Date(year, month, d))
        const we = dw === 0 || dw === 6
        const bg: [n,n,n] = di ? hexToRgb(di.bg) : we ? WKD : WHT
        const tc: [n,n,n] = di ? hexToRgb(di.text) : BLK
        return {
          content: di?.code ?? "",
          styles: { fillColor:bg, textColor:tc, fontStyle:"bold" as const,
                    halign:"center" as const, fontSize:7, cellPadding:1.5 }
        }
      })
      return [numCell, nameCell, ...dayCells]
    })

    // ── Render ────────────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
    autoTable(doc, {
      head, body,
      startY: 6,
      margin: { left:margin, right:margin },
      styles: {
        fontSize:7.5, cellPadding:1.8, overflow:"ellipsize",
        valign:"middle", halign:"center",
        lineWidth:0.2, lineColor:[160,160,160] as [n,n,n],
      },
      headStyles: { fontStyle:"bold" },
      columnStyles: {
        0: { cellWidth:12, halign:"center" },
        1: { cellWidth:38, halign:"left"   },
        // dia columns fill the rest equally
        ...Object.fromEntries(days.map((_,i) => [i+2, { cellWidth:dayW }]))
      },
      theme: "grid",
    })
    doc.save(`Escala_Mensal_${format(currentDate,"yyyy-MM")}.pdf`)
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
          
          setToastMsg("✅ Imagem transferida! Partilhe manualmente no WhatsApp")
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

          {/* Alertas */}
          {(() => {
            const urgCount = alertas.filter(a => a.severidade === "vermelho").length
            const avisoCount = alertas.filter(a => a.severidade === "amarelo").length
            return (
              <Button
                onClick={() => setAlertasModalOpen(true)}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2 relative border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <AlertCircle className="h-4 w-4"/>
                Alertas
                {urgCount > 0 && (
                  <span style={{
                    position:"absolute", top:-6, right: avisoCount > 0 ? 12 : -6,
                    background:"#EF4444", color:"#fff", fontSize:10, fontWeight:800,
                    borderRadius:99, minWidth:16, height:16,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:"0 4px", boxShadow:"0 1px 4px rgba(239,68,68,0.5)",
                  }}>
                    {urgCount}
                  </span>
                )}
                {avisoCount > 0 && (
                  <span style={{
                    position:"absolute", top:-6, right:-6,
                    background:"#F59E0B", color:"#fff", fontSize:10, fontWeight:800,
                    borderRadius:99, minWidth:16, height:16,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:"0 4px", boxShadow:"0 1px 4px rgba(245,158,11,0.5)",
                  }}>
                    {avisoCount}
                  </span>
                )}
              </Button>
            )
          })()}

          {/* Dropdown Export */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <MoreVertical className="h-4 w-4"/> Exportar
            </Button>
            {exportMenuOpen && (
              <>
                <div style={{position:"fixed",inset:0}} onClick={() => setExportMenuOpen(false)}/>
                <div style={{
                  position:"absolute", top:"100%", right:0, marginTop:6,
                  background:"#fff", border:"1px solid #E5E7EB", borderRadius:8,
                  boxShadow:"0 10px 24px rgba(0,0,0,0.12)", zIndex:50, minWidth:180, overflow:"hidden",
                }}>
                  <button
                    onClick={() => { printEscala(); setExportMenuOpen(false) }}
                    style={{ width:"100%",padding:"10px 14px",textAlign:"left",border:"none",background:"none",cursor:"pointer",fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #F3F4F6",transition:"background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="#F9FAFB")}
                    onMouseLeave={e => (e.currentTarget.style.background="none")}
                  >
                    <Printer size={16}/> Imprimir
                  </button>
                  <button
                    onClick={() => { exportPDF(); setExportMenuOpen(false) }}
                    style={{ width:"100%",padding:"10px 14px",textAlign:"left",border:"none",background:"none",cursor:"pointer",fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #F3F4F6",transition:"background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="#F9FAFB")}
                    onMouseLeave={e => (e.currentTarget.style.background="none")}
                  >
                    <FileDown size={16}/> Baixar PDF
                  </button>
                  <button
                    onClick={() => { shareWA(); setExportMenuOpen(false) }}
                    disabled={sharingWA}
                    style={{ width:"100%",padding:"10px 14px",textAlign:"left",border:"none",background:"none",cursor:sharingWA?"not-allowed":"pointer",fontSize:13,color:sharingWA?"#D1D5DB":"#10B981",display:"flex",alignItems:"center",gap:10,transition:"background 0.2s",opacity:sharingWA?0.6:1 }}
                    onMouseEnter={e => !sharingWA && (e.currentTarget.style.background="#F0FDF4")}
                    onMouseLeave={e => (e.currentTarget.style.background="none")}
                  >
                    {sharingWA ? <Loader size={16} className="animate-spin"/> : <MessageCircle size={16}/>}
                    {sharingWA ? "A enviar..." : "WhatsApp"}
                  </button>
                </div>
              </>
            )}
          </div>
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
              {groupedAuxiliares.length === 0 ? (
                <tr><td colSpan={days.length+2} style={{textAlign:"center",padding:32,color:"#9CA3AF",fontSize:13}}>Nenhum auxiliar registado.</td></tr>
              ) : groupedAuxiliares.map(({equipa, membros}) => (
                <>
                  <tr key={`header-${equipa}`}>
                    <td colSpan={days.length+2} style={{
                      background:"#D9D9D9",fontWeight:700,textAlign:"center",fontSize:10,
                      padding:"4px 0",borderTop:"2px solid #999",borderBottom:"1px solid #BBB",
                      position:"sticky",left:0,letterSpacing:"0.05em",color:"#374151"
                    }}>
                      {equipa}
                    </td>
                  </tr>
                  {membros.map((aux,idx)=>{
                    const rowBg = idx%2===0?"#FFFFFF":"#FAFAFA"
                    return(
                      <tr key={aux.id}>
                        <td style={tdS("#EBEBEB",{position:"sticky",left:0,zIndex:10,fontWeight:700,fontSize:10,background:"#EBEBEB"})}>{aux.numero_mecanografico??""}</td>
                        <td style={tdS("#EBEBEB",{position:"sticky",left:44,zIndex:10,whiteSpace:"nowrap",fontWeight:600,fontSize:10,textAlign:"left",paddingLeft:8,background:"#EBEBEB"})}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <button onClick={()=>setDrawerAux(aux)} style={{background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:10,color:"#111827",padding:0,textAlign:"left"}} onMouseEnter={e=>(e.currentTarget.style.color="#2563EB")} onMouseLeave={e=>(e.currentTarget.style.color="#111827")}>{aux.nome}</button>
                            <button onClick={e=>{e.stopPropagation();navegarParaSemanal(aux)}} title="Ver na escala semanal" style={{background:"none",border:"none",cursor:"pointer",padding:"1px 2px",display:"flex",alignItems:"center",opacity:0.45,flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.opacity="1"}} onMouseLeave={e=>{e.currentTarget.style.opacity="0.45"}}><CalendarDays size={11} color="#2563EB"/></button>
                          </div>
                        </td>
                        {days.map(d=>{
                          const e=getEscala(aux.id,d); const di=getCellDisplay(e, aux.id, d)
                          const we=isWeekend(year,month,d)
                          const dateStr=mkDateStr(d)
                          const bg=di?di.bg:we?"#E5E7EB":rowBg
                          const fl=flashCells.has(`${aux.id}_${dateStr}`)
                          const isCtrlSel = ctrlSelMensal && ctrlSelMensal.auxId===aux.id && ctrlSelMensal.data===dateStr
                          const isSwappedM = swappedCellsMensal.has(`${aux.id}_${dateStr}`)
                          const hasTurno = !!e?.turno_id
                          const isBlink = blinkCell && blinkCell.data === dateStr && (blinkCell.auxiliarId === aux.id || !blinkCell.auxiliarId)
                          return(
                            <td key={d}
                              onClick={()=>{
                                if (ctrlHeldMensal && hasTurno) { handleCtrlClickMensal(aux.id, d) }
                                else { openCell(aux.id,d) }
                              }}
                              title={di?.code??(di?.isSemanal?"(da escala semanal)":"")}
                              style={{ border:`2px solid ${isCtrlSel?"#2563EB":isSwappedM?"#2563EB":isBlink?(blinkIsUrg?"#EF4444":"#F59E0B"):di?.isSemanal?"#6366F1":"#CCC"}`,padding:"2px 0",textAlign:"center",cursor:ctrlHeldMensal&&hasTurno?"crosshair":"pointer",background:isCtrlSel?"#DBEAFE":bg,color:di?di.text:"#374151",fontWeight:di?700:400,fontSize:10,minWidth:30,userSelect:"none",transition:"filter 0.1s",animation:fl?"cellFlash 0.8s ease":isSwappedM?"swapFlash 1.2s ease 2":isBlink?(blinkIsUrg?"blinkRed 1s ease 3":"blinkYellow 1s ease 3"):"none",fontStyle:di?.isSemanal?"italic":"normal",opacity:di?.isSemanal?0.8:1 }}
                              onMouseEnter={ev=>(ev.currentTarget.style.filter="brightness(0.88)")}
                              onMouseLeave={ev=>(ev.currentTarget.style.filter="brightness(1)")}>
                              {di?.code??""}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {!loading&&<div className="mt-3 flex flex-wrap gap-2">
        {SPECIAL.map(s=><span key={s.code} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border" style={{background:s.bg,color:s.text,borderColor:s.bg}}><strong>{s.code}</strong> — {s.label}</span>)}
      </div>}

      {/* Painel de Alertas Mensais */}
      <AlertPanel
        open={alertasModalOpen}
        onClose={() => setAlertasModalOpen(false)}
        alertas={alertas}
        titulo="Alertas do Mês"
        subtitulo={format(currentDate, "MMMM yyyy", { locale: ptBR })}
        onEyeClick={handleEyeClick}
        onActionClick={(acao) => { handleAlertAction(acao.auxId, acao.dia); setAlertasModalOpen(false) }}
      />

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
            {/* Banner de baixa/ausência */}
            {(()=>{
              if (!existingInCell?.codigo_especial) return null
              const BAIXA_CODES = ["L","Aci"]
              if (!BAIXA_CODES.includes(existingInCell.codigo_especial)) return null
              const motivo = existingInCell.codigo_especial === "L" ? "baixa médica / licença" : "acidente de trabalho"
              return(
                <div style={{marginTop:10,padding:"8px 12px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,fontSize:12,color:"#92400E",display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,lineHeight:1}}>⚠️</span>
                  <div>
                    <div style={{fontWeight:600}}>{selectedAux?.nome} encontra-se de {motivo} neste dia.</div>
                    <div style={{fontSize:11,opacity:0.8,marginTop:2}}>Considere alocar um substituto para garantir cobertura.</div>
                  </div>
                </div>
              )
            })()}
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
              ? <p style={{textAlign:"center",color:"#9CA3AF",fontSize:12,padding:"14px 0"}}>{turnos.length===0?"Nenhum turno registado.":"Sem resultados."}</p>
              : <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7}}>
                  {filteredTurnos.map(t=>{const {bg,text}=getTurnoColor(t);const sel=selTurnoId===t.id;return(
                    <button key={t.id} onClick={()=>selectTurno(t.id)} style={{background:sel?bg:"#FAFAFA",color:sel?text:"#374151",border:`2px solid ${sel?text+"60":"#E5E7EB"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",fontSize:11,fontWeight:sel?700:500,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.12s",outline:"none",boxShadow:sel?`0 0 0 2px ${bg}`:"none"}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,lineHeight:1}}>{t.nome}</div>
                        <div style={{fontSize:10,opacity:0.65,marginTop:3}}>{(t.horario_inicio||"--").slice(0,5)} – {(t.horario_fim||"--").slice(0,5)}</div>
                      </div>
                      {sel&&<Check size={15}/>}
                    </button>
                  )})}
                </div>}
          </div>
          {/* footer */}
          <div style={{padding:"14px 22px",borderTop:"1px solid #F0F0F0",display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:6}}>
              <button onClick={clearEscala} disabled={!existingInCell} style={{background:existingInCell?"#FEF2F2":"#F9FAFB",color:existingInCell?"#DC2626":"#D1D5DB",border:`1.5px solid ${existingInCell?"#FECACA":"#E5E7EB"}`,borderRadius:9,padding:"8px 16px",cursor:existingInCell?"pointer":"not-allowed",fontSize:13,fontWeight:600}}>Limpar</button>
              {existingInCell?.turno_id && !existingInCell?.codigo_especial && (
                <button onClick={openSwapMensal} style={{display:"flex",alignItems:"center",gap:5,background:"#EFF6FF",color:"#2563EB",border:"1.5px solid #BFDBFE",borderRadius:9,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600}}>
                  <ArrowLeftRight size={13}/> Trocar
                </button>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={closeDialog} style={{background:"#F4F4F5",color:"#374151",border:"none",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>Cancelar</button>
              <button onClick={saveEscala} disabled={saving||!hasSelection} style={{background:saving||!hasSelection?"#E5E7EB":"#4F46E5",color:saving||!hasSelection?"#9CA3AF":"#FFFFFF",border:"none",borderRadius:9,padding:"8px 20px",cursor:saving||!hasSelection?"not-allowed":"pointer",fontSize:13,fontWeight:700,boxShadow:!saving&&hasSelection?"0 2px 8px rgba(79,70,229,0.35)":"none"}}>
                {saving?"A guardar...":"Guardar"}
              </button>
            </div>
          </div>
        </div>
      </>}

      {/* Modal de Substituição */}
      {substitutoModalOpen && substitutoAuxId && substitutoData && (() => {
        const auxIndisponivel = auxiliares.find(a => a.id === substitutoAuxId)
        const disponíveis = getAuxiliaresDisponiveisParaSubstituir(substitutoData, substitutoAuxId)
        const dayNum = parseInt(substitutoData.split("-")[2])
        const label = `${dayNum}/${month+1} (${DIAS_PT[getDay(new Date(year, month, dayNum))]})`

        return (
          <>
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:60,backdropFilter:"blur(3px)",animation:"mFadeIn 0.15s ease"}} onClick={()=>setSubstitutoModalOpen(false)}/>
            <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#fff",borderRadius:18,zIndex:61,width:480,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.28),0 0 0 1px rgba(0,0,0,0.06)",animation:"mSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>
              {/* header */}
              <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #F0F0F0"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:15,color:"#111"}}>Alocar Substituto</div>
                    <div style={{fontSize:12,color:"#9CA3AF",marginTop:3,fontWeight:500}}>{auxIndisponivel?.nome} — {label}</div>
                  </div>
                  <button onClick={()=>setSubstitutoModalOpen(false)} style={{background:"#F4F4F5",border:"none",cursor:"pointer",padding:"6px",borderRadius:8,color:"#71717A",lineHeight:0}}><X size={16}/></button>
                </div>
              </div>
              {/* body */}
              <div style={{overflowY:"auto",padding:"16px 22px",flex:1}}>
                {disponíveis.length === 0 ? (
                  <div style={{textAlign:"center",color:"#9CA3AF",fontSize:12,padding:"20px 0"}}>
                    Nenhum auxiliar disponível neste dia.
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {disponíveis.map(aux => (
                      <button
                        key={aux.id}
                        onClick={async () => {
                          // Alocar o auxiliar como substituto
                          const payload = { auxiliar_id:aux.id, data:substitutoData, tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:null }
                          const ex = escalas.find(e => e.auxiliar_id === aux.id && e.data === substitutoData)

                          let savedId: string | null = null
                          if (ex) {
                            const {error} = await supabase.from("escalas").update(payload).eq("id", ex.id)
                            if (!error) savedId = ex.id
                          } else {
                            const {data:rows, error} = await supabase.from("escalas").insert(payload).select("id")
                            if (!error && rows?.length) savedId = rows[0].id
                          }

                          if (savedId) {
                            setEscalas(p => ex ? p.map(e=>e.id===ex.id?{...payload,id:ex.id}:e) : [...p, {...payload, id:savedId}])
                            flashCell(aux.id, substitutoData)
                            showToastMsg(`✅ ${aux.nome} alocado/a como substituto em ${label}`)
                            setSubstitutoModalOpen(false)
                            setSubstitutoAuxId(null)
                            setSubstitutoData(null)
                          }
                        }}
                        style={{
                          background:aux.jaTemNodia?"#F9FAFB":"#FFFFFF",
                          border:`1.5px solid ${aux.jaTemNodia?"#E5E7EB":"#D1D5DB"}`,
                          borderRadius:10,
                          padding:"12px 14px",
                          cursor:aux.jaTemNodia?"not-allowed":"pointer",
                          fontSize:12,
                          fontWeight:500,
                          textAlign:"left",
                          transition:"all 0.12s",
                          opacity:aux.jaTemNodia?0.5:1,
                          display:"flex",
                          justifyContent:"space-between",
                          alignItems:"center",
                        }}
                        disabled={aux.jaTemNodia}
                      >
                        <div>
                          <div style={{fontWeight:600,fontSize:13,color:"#111"}}>{aux.nome}</div>
                          <div style={{fontSize:10,color:"#9CA3AF",marginTop:2}}>Nº {aux.numero_mecanografico} • {aux.totalHoras}h este mês • {aux.turnos_mes} turnos</div>
                        </div>
                        {aux.jaTemNodia && <span style={{fontSize:9,color:"#9CA3AF"}}>Já tem atribuição</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* Swap Modal — 3 passos */}
      {swapMensal && swapMensalSource && (() => {
        const sourceAux = auxiliares.find(a => a.id === swapMensalSource.auxId)
        const sourceDayNum = parseInt(swapMensalSource.data.split("-")[2])
        const sourceDayLabel = `${sourceDayNum} ${DIAS_PT[getDay(new Date(year, month, sourceDayNum))]}`
        const otherAux = auxiliares.filter(a => a.id !== swapMensalSource.auxId)
        const targetShifts = swapMensalTargetAuxId ? getAuxShiftsForMonth(swapMensalTargetAuxId) : []
        const targetAux = swapMensalTargetAuxId ? auxiliares.find(a => a.id === swapMensalTargetAuxId) : null
        return (
          <>
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:60,backdropFilter:"blur(3px)",animation:"mFadeIn 0.15s ease"}} onClick={()=>{setSwapMensal(false);setSwapMensalSource(null);setSwapMensalTargetAuxId(null);setSwapMensalTargetShift(null)}}/>
            <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#fff",borderRadius:18,zIndex:61,width:460,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.28),0 0 0 1px rgba(0,0,0,0.06)",animation:"mSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>
              {/* header */}
              <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:"#111",display:"flex",alignItems:"center",gap:7}}><ArrowLeftRight size={15} color="#2563EB"/> Troca de Turno</div>
                  <div style={{fontSize:12,color:"#9CA3AF",marginTop:3}}>{sourceAux?.nome} — {swapMensalSource.turnoNome} — {sourceDayLabel}</div>
                </div>
                <button onClick={()=>{setSwapMensal(false);setSwapMensalSource(null);setSwapMensalTargetAuxId(null);setSwapMensalTargetShift(null)}} style={{background:"#F4F4F5",border:"none",cursor:"pointer",padding:"6px",borderRadius:8,color:"#71717A",lineHeight:0}}><X size={16}/></button>
              </div>
              {/* body */}
              <div style={{overflowY:"auto",flex:1,padding:"16px 22px"}}>
                {!swapMensalTargetAuxId ? (
                  /* Passo 1 — escolher auxiliar */
                  <>
                    <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Passo 1 — Escolher auxiliar</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {otherAux.map(a => {
                        const shifts = getAuxShiftsForMonth(a.id)
                        if (shifts.length === 0) return null
                        return (
                          <button key={a.id} onClick={()=>setSwapMensalTargetAuxId(a.id)}
                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#F9FAFB",border:"1.5px solid #E5E7EB",borderRadius:10,padding:"10px 14px",cursor:"pointer",fontSize:13,fontWeight:600,color:"#111",textAlign:"left"}}
                            onMouseEnter={e=>{e.currentTarget.style.background="#EFF6FF";e.currentTarget.style.borderColor="#2563EB"}}
                            onMouseLeave={e=>{e.currentTarget.style.background="#F9FAFB";e.currentTarget.style.borderColor="#E5E7EB"}}>
                            <span>{a.nome}</span>
                            <span style={{fontSize:11,color:"#9CA3AF",fontWeight:400}}>{shifts.length} turnos</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : !swapMensalTargetShift ? (
                  /* Passo 2 — escolher turno do aux alvo */
                  <>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                      <button onClick={()=>setSwapMensalTargetAuxId(null)} style={{background:"#F4F4F5",border:"none",cursor:"pointer",padding:"5px 8px",borderRadius:7,fontSize:12,color:"#374151",fontWeight:600}}>← Voltar</button>
                      <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.07em"}}>Passo 2 — Turno de {targetAux?.nome}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {targetShifts.map(sh => {
                        const dayLabel = `${sh.dayNum} ${DIAS_PT[getDay(new Date(year, month, sh.dayNum))]}`
                        return (
                          <button key={sh.data} onClick={()=>setSwapMensalTargetShift({ auxId: swapMensalTargetAuxId, data: sh.data, turnoId: sh.turnoId, turnoNome: sh.turnoNome })}
                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#F9FAFB",border:"1.5px solid #E5E7EB",borderRadius:10,padding:"10px 14px",cursor:"pointer",fontSize:13,fontWeight:600,color:"#111"}}
                            onMouseEnter={e=>{e.currentTarget.style.background="#EFF6FF";e.currentTarget.style.borderColor="#2563EB"}}
                            onMouseLeave={e=>{e.currentTarget.style.background="#F9FAFB";e.currentTarget.style.borderColor="#E5E7EB"}}>
                            <span style={{fontSize:15,fontWeight:800}}>{sh.turnoNome}</span>
                            <span style={{fontSize:11,color:"#9CA3AF",fontWeight:500}}>{dayLabel}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  /* Passo 3 — confirmação */
                  <>
                    <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:14}}>Passo 3 — Confirmar Troca</div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {[
                        { aux: sourceAux, turno: swapMensalTargetShift.turnoNome, data: swapMensalSource.data },
                        { aux: targetAux, turno: swapMensalSource.turnoNome, data: swapMensalTargetShift.data },
                      ].map((item, i) => {
                        const dayNum = parseInt(item.data.split("-")[2])
                        const dayLabel = `${dayNum} ${DIAS_PT[getDay(new Date(year, month, dayNum))]}`
                        return (
                          <div key={i} style={{background:"#F0F9FF",border:"1.5px solid #BAE6FD",borderRadius:12,padding:"12px 16px"}}>
                            <div style={{fontWeight:700,fontSize:13,color:"#0C4A6E"}}>{item.aux?.nome}</div>
                            <div style={{fontSize:12,color:"#0369A1",marginTop:3}}>Faz Turno <strong>{item.turno}</strong> no dia <strong>{dayLabel}</strong></div>
                          </div>
                        )
                      })}
                      <div style={{textAlign:"center",fontSize:18,color:"#9CA3AF"}}>↕</div>
                    </div>
                  </>
                )}
              </div>
              {/* footer */}
              {swapMensalTargetShift && (
                <div style={{padding:"14px 22px",borderTop:"1px solid #F0F0F0",display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setSwapMensalTargetShift(null)} style={{background:"#F4F4F5",color:"#374151",border:"none",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>Voltar</button>
                  <button onClick={()=>executeMensalSwap(swapMensalSource!, swapMensalTargetShift!)} disabled={swappingMensal}
                    style={{background:swappingMensal?"#E5E7EB":"#2563EB",color:swappingMensal?"#9CA3AF":"#fff",border:"none",borderRadius:9,padding:"8px 20px",cursor:swappingMensal?"not-allowed":"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                    {swappingMensal?<><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>A trocar…</>:<><ArrowLeftRight size={13}/>Confirmar Troca</>}
                  </button>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Ctrl+Click swap confirm (Mensal) */}
      {swapMensalConfirmOpen && swapMensalSource && swapMensalTargetShift && (() => {
        const auxA = auxiliares.find(a => a.id === swapMensalSource.auxId)
        const auxB = auxiliares.find(a => a.id === swapMensalTargetShift.auxId)
        const dayA = parseInt(swapMensalSource.data.split("-")[2])
        const dayB = parseInt(swapMensalTargetShift.data.split("-")[2])
        const labelA = `${dayA} ${DIAS_PT[getDay(new Date(year, month, dayA))]}`
        const labelB = `${dayB} ${DIAS_PT[getDay(new Date(year, month, dayB))]}`
        return (
          <>
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:62,backdropFilter:"blur(3px)",animation:"mFadeIn 0.15s ease"}} onClick={()=>setSwapMensalConfirmOpen(false)}/>
            <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#fff",borderRadius:16,zIndex:63,width:380,maxWidth:"92vw",boxShadow:"0 24px 64px rgba(0,0,0,0.22)",padding:"1.75rem 1.5rem",animation:"mSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"#EFF6FF",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}><ArrowLeftRight size={20} color="#2563EB"/></div>
              <h3 style={{textAlign:"center",fontSize:15,fontWeight:700,margin:"0 0 1rem",color:"#111"}}>Confirmar Troca</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:"1.5rem"}}>
                {[{aux:auxA,turno:swapMensalTargetShift.turnoNome,label:labelA},{aux:auxB,turno:swapMensalSource.turnoNome,label:labelB}].map((item,i)=>(
                  <div key={i} style={{background:"#F0F9FF",border:"1.5px solid #BAE6FD",borderRadius:10,padding:"10px 14px"}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#0C4A6E"}}>{item.aux?.nome}</div>
                    <div style={{fontSize:11,color:"#0369A1",marginTop:2}}>Faz Turno <strong>{item.turno}</strong> — {item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setSwapMensalConfirmOpen(false)} style={{flex:1,padding:"0.65rem",background:"#F4F4F5",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151"}}>Cancelar</button>
                <button onClick={()=>executeMensalSwap(swapMensalSource!, swapMensalTargetShift!)} disabled={swappingMensal}
                  style={{flex:1,padding:"0.65rem",background:swappingMensal?"#E5E7EB":"#2563EB",border:"none",borderRadius:9,cursor:swappingMensal?"not-allowed":"pointer",fontSize:13,fontWeight:700,color:swappingMensal?"#9CA3AF":"#fff"}}>
                  {swappingMensal?"A trocar…":"Trocar"}
                </button>
              </div>
            </div>
          </>
        )
      })()}

      <style>{`
        @keyframes mFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes mSlideUp{from{opacity:0;transform:translate(-50%,-46%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes slideLeftIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
        @keyframes cellFlash{0%{filter:brightness(1.9) saturate(1.5)}50%{filter:brightness(1.3) saturate(1.2)}100%{filter:brightness(1) saturate(1)}}
        @keyframes swapFlash{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}25%,75%{box-shadow:0 0 0 4px rgba(37,99,235,0.55)}50%{box-shadow:0 0 0 6px rgba(37,99,235,0.85)}}
        @keyframes blinkRed{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}25%,75%{box-shadow:0 0 0 4px rgba(239,68,68,0.6)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0.9);background:#FEE2E2}}
        @keyframes blinkYellow{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}25%,75%{box-shadow:0 0 0 4px rgba(245,158,11,0.5)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0.8);background:#FEF3C7}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        
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
