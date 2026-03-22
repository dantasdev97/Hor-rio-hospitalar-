import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { format, startOfWeek, addDays, getDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Search, X, Check, FileDown, MessageCircle, Loader2, Trash2, RotateCcw, Printer, Loader, Info, AlertCircle, MoreVertical } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import html2canvas from "html2canvas"
import { supabase } from "@/lib/supabaseClient"
import { useConfig } from "@/contexts/ConfigContext"
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
  { key:"TAC2",      label:"TAC 2",              bg:"#FFFFFF" },
  { key:"TAC1",      label:"TAC 1",              bg:"#FFFFFF" },
  { key:"EXAM1",     label:"ECO URG",             bg:"#C4B09A" },
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
  EXAM1:     { shifts: ["M","T","N"], days: ["weekday","saturday","sunday"] },
  EXAM2:     { shifts: ["M","T","N"], days: ["weekday","saturday"] },
  TRANSPORT: { shifts: ["M","T"],    days: ["weekday","saturday","sunday"] },
  TAC1:      { shifts: ["M","T"],    days: ["weekday","saturday"] },
  SALA6:     { shifts: ["M"],        days: ["weekday","saturday","sunday"] },
  SALA7:     { shifts: ["M","T"],    days: ["weekday","saturday","sunday"] },
}

function getPostoTipo(posto: PostoKey, turno: TurnoLetra): PostoTipo {
  if ((posto === "EXAM1" || posto === "EXAM2") && turno === "N") return "doutor"
  return "auxiliar"
}
// Returns maximum number of persons allowed in a cell (1 = single, 2 = double, 3 = triple)
function getMaxPersons(posto: PostoKey, turno: TurnoLetra): number {
  if (posto === "TRANSPORT" && turno === "M") return 2
  if (posto === "EXAM1" && turno !== "N") return 2   // M e T: 2 aux; N: doutor (1)
  if (posto === "EXAM2" && turno === "M") return 3   // M: 3 aux; N: doutor (1)
  return 1
}
function isMultiPerson(posto: PostoKey, turno: TurnoLetra): boolean {
  return getMaxPersons(posto, turno) > 1
}
function postoInfo(key: PostoKey) { return POSTOS.find(p => p.key===key)! }

const ABSENCE_LABELS: Record<string, string> = {
  D: "Descanso", F: "Folga", Fe: "Comp. Feriado",
  FAA: "Férias Ano Anterior", L: "Licença", Aci: "Acidente Trabalho",
}

// ─── Config ───────────────────────────────────────────────────────────────────

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
  const { horarios } = useConfig()
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightAuxId,   setHighlightAuxId]   = useState<string | null>(null)
  const [highlightAuxNome, setHighlightAuxNome] = useState<string | null>(null)
  const [referenceDate, setReferenceDate] = useState(() => {
    const week = searchParams.get("week")
    if (week) { try { return parseISO(week) } catch { /* ignore */ } }
    return new Date()
  })
  const [auxiliares, setAuxiliares] = useState<Person[]>([])
  const [doutores,   setDoutores]   = useState<Person[]>([])
  const [escalas,    setEscalas]    = useState<EscalaRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [mensalEntries, setMensalEntries] = useState<MensalEntry[]>([])
  const [turnosData,    setTurnosData]    = useState<TurnoComPostos[]>([])
  const [restricoes,    setRestricoes]    = useState<Restricao[]>([])
  const [ausenciasEntries, setAusenciasEntries] = useState<{ id:string; data:string; auxiliar_id:string|null; codigo_especial:string|null }[]>([])
  const [sharingWA,     setSharingWA]     = useState(false)
  const [showToast,  setShowToast]  = useState(false)
  const [toastMsg,   setToastMsg]   = useState("")
  const [undoState,  setUndoState]  = useState<UndoState | null>(null)
  const [undoing,    setUndoing]    = useState(false)
  const [showClear,  setShowClear]  = useState(false)
  const [alertasModalOpen, setAlertasModalOpen] = useState(false)
  const [alertasTipo, setAlertasTipo] = useState<"all" | "erro" | "aviso" | "info">("all")
  const [alertasDia, setAlertasDia] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [selCell,     setSelCell]     = useState<{ data:string; turnoLetra:TurnoLetra; posto:PostoKey; tipo:PostoTipo }|null>(null)
  const [selPersonId,  setSelPersonId]  = useState("")
  const [selPersonIds, setSelPersonIds] = useState<string[]>([]) // multi-select para TRANSPORT+M
  const [selOriginalId, setSelOriginalId] = useState("")          // id pré-carregado ao abrir modal
  const [modalTouched,  setModalTouched]  = useState(false)       // utilizador interagiu com modal
  const [search,       setSearch]       = useState("")
  const [filterTab,    setFilterTab]    = useState<"available" | "restricted" | "allocated">("available")
  const searchRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const weekStart = startOfWeek(referenceDate, { weekStartsOn:1 })
  const weekDays  = Array.from({ length:7 }, (_,i) => addDays(weekStart, i))
  const startDate = format(weekDays[0],"yyyy-MM-dd")
  const endDate   = format(weekDays[6],"yyyy-MM-dd")

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)
    try {
      const [{ data:a },{ data:d },{ data:e },{ data:m },{ data:t },{ data:r },{ data:abs }] = await Promise.all([
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
        supabase.from("escalas").select("id,data,auxiliar_id,codigo_especial")
          .eq("tipo_escala","mensal")
          .gte("data",startDate).lte("data",endDate)
          .not("codigo_especial","is",null),
      ])
      setAuxiliares(a ?? [])
      setDoutores(d ?? [])
      setEscalas(e ?? [])
      setMensalEntries(m ?? [])
      setTurnosData((t ?? []).map(x => ({ ...x, postos: (x.postos as string[] | null) ?? [] })))
      setRestricoes(r ?? [])
      setAusenciasEntries(abs ?? [])
    } catch (err) {
      console.error("Erro ao carregar dados da escala semanal:", err)
      alert("Erro ao carregar dados. Verifique a ligação à internet e tente novamente.")
    } finally {
      setLoading(false)
    }
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

  async function refetchAusenciasEntries() {
    const { data: abs } = await supabase
      .from("escalas").select("id,data,auxiliar_id,codigo_especial")
      .eq("tipo_escala","mensal")
      .gte("data",startDate).lte("data",endDate)
      .not("codigo_especial","is",null)
    if (abs) setAusenciasEntries(abs)
  }

  useEffect(() => { fetchAll() }, [startDate])

  // ── Ler params da URL (auxiliarId, auxiliarNome, week) ────────────────────
  useEffect(() => {
    const auxId   = searchParams.get("auxiliarId")
    const auxNome = searchParams.get("auxiliarNome")
    const week    = searchParams.get("week")
    if (auxId)   { setHighlightAuxId(auxId); setHighlightAuxNome(auxNome) }
    if (week) {
      try { setReferenceDate(parseISO(week)) } catch { /* ignore */ }
    }
    // Limpar params da URL para não persistirem ao navegar
    if (auxId || week) setSearchParams({}, { replace: true })
  }, [])

  // ── Realtime: mensal → semanal ─────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`semanal-sync-${startDate}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'escalas' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: string; tipo_escala?: string } | undefined
          if (row?.tipo_escala === 'mensal' && row?.data && row.data >= startDate && row.data <= endDate) {
            refetchMensalEntries()
            refetchAusenciasEntries()
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

  // Retorna descrição legível da restrição activa (ex: "este posto (RX URG)" ou "este turno (M)")
  function getRestricaoDescricao(auxId: string, posto: string, turnoLetra: string, date: string): string {
    const postoLabel = POSTOS.find(p => p.key === posto)?.label ?? posto
    for (const r of restricoes) {
      if (r.auxiliar_id !== auxId) continue
      if (r.data_fim   && r.data_fim   < date) continue
      if (r.data_inicio && r.data_inicio > date) continue
      if (r.posto && r.posto !== posto) continue
      if (r.posto && r.turno_id) {
        const t = turnosData.find(t => t.id === r.turno_id)
        if (t && turnoToLetra(t) === turnoLetra)
          return `este posto e turno (${postoLabel}-${turnoLetra})`
      } else if (r.posto) {
        return `este posto (${postoLabel})`
      } else if (r.turno_id) {
        const t = turnosData.find(t => t.id === r.turno_id)
        if (t && turnoToLetra(t) === turnoLetra)
          return `este turno (${turnoLetra})`
      }
    }
    return "este posto ou turno"
  }

  // ── Pre-compute mensal → semanal assignment map ────────────────────────────
  // Uses turno.postos (from DB) — not the hardcoded POSTO_SCHEDULE — so the
  // distribution respects the actual postos configured on each turno.
  // Each aux occupies exactly ONE posto (first available from turno.postos order).
  // Multiple aux on the same turno distribute sequentially.
  const mensalAssignMap = useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>()
    // Aux already manually assigned in semanal → skip from auto-distribution
    const manualAuxKeys = new Set(
      escalas.filter(e => e.auxiliar_id).map(e => `${e.data}|${e.turno_letra}|${e.auxiliar_id}`)
    )
    for (const day of weekDays) {
      const dateStr = format(day, "yyyy-MM-dd")
      const d = getDay(day)
      const dayType: DayType = d === 0 ? "sunday" : d === 6 ? "saturday" : "weekday"

      // Process each mensal entry for this day
      const dayEntries = mensalEntries.filter(me =>
        me.data === dateStr && me.auxiliar_id && me.turno_id
      )
      for (const me of dayEntries) {
        const turno = turnosData.find(t => t.id === me.turno_id)
        if (!turno) continue
        const turnoLetra = turnoToLetra(turno)
        if (!turnoLetra) continue
        if (manualAuxKeys.has(`${dateStr}|${turnoLetra}|${me.auxiliar_id}`)) continue

        // Postos configured on this turno (DB), filtered to valid + aux + active day
        const turnoPostos = (turno.postos ?? []).filter(p => {
          if (!POSTOS.find(pp => pp.key === p)) return false          // unknown posto → skip
          const postoKey = p as PostoKey
          if (getPostoTipo(postoKey, turnoLetra) !== "auxiliar") return false
          const rule = POSTO_SCHEDULE[postoKey]
          return !rule || rule.days.includes(dayType)                 // respect day schedule
        })

        // Assign aux to first available posto from turno's configured list
        for (const posto of turnoPostos) {
          const postoKey = posto as PostoKey
          const max = getMaxPersons(postoKey, turnoLetra)
          const current = map.get(`${dateStr}|${turnoLetra}|${posto}`) ?? []
          if (current.length >= max) continue
          if (!auxTemRestricao(me.auxiliar_id!, posto, turnoLetra, dateStr)) {
            map.set(`${dateStr}|${turnoLetra}|${posto}`, [...current, me.auxiliar_id!])
            break
          }
        }
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensalEntries, turnosData, escalas, restricoes, startDate])

  function getAusenciaCode(auxId: string, date: string): string | null {
    return ausenciasEntries.find(a => a.auxiliar_id === auxId && a.data === date)?.codigo_especial ?? null
  }

  function getAuxBlockReason(
    auxId: string,
    posto: PostoKey,
    turnoLetra: TurnoLetra,
    data: string
  ): string | null {
    const cfg = horarios
    // Regra 1: Aux com turno N no dia anterior não pode fazer turno M no dia seguinte
    if (turnoLetra === "M") {
      const prevDate = format(addDays(parseISO(data), -1), "yyyy-MM-dd")
      const hasNocPrevMensal = mensalEntries.some(me => {
        if (me.auxiliar_id !== auxId || me.data !== prevDate || !me.turno_id) return false
        const t = turnosData.find(t => t.id === me.turno_id)
        return !!(t && turnoToLetra(t) === "N")
      })
      const hasNocPrevSemanal = escalas.some(e =>
        e.auxiliar_id === auxId && e.data === prevDate && e.turno_letra === "N"
      )
      if (hasNocPrevMensal || hasNocPrevSemanal)
        return "Trabalhou no turno noturno do dia anterior — descanso obrigatório"
      // Também bloquear se tem N no mesmo dia
      const hasNocMensal = mensalEntries.some(me => {
        if (me.auxiliar_id !== auxId || me.data !== data || !me.turno_id) return false
        const t = turnosData.find(t => t.id === me.turno_id)
        return !!(t && turnoToLetra(t) === "N")
      })
      const hasNocSemanal = escalas.some(e =>
        e.auxiliar_id === auxId && e.data === data && e.turno_letra === "N"
      )
      if (hasNocMensal || hasNocSemanal) return "Trabalha no turno noturno neste dia"
    }
    // Regra 2: Aux já alocado noutro posto no mesmo dia/turno (só se alertasConflito)
    if (cfg.alertasConflito) {
      for (const p of POSTOS) {
        if (p.key === posto) continue
        if (!postoOpera(p.key, turnoLetra, data)) continue
        const esc = getEscala(data, turnoLetra, p.key)
        if (esc?.auxiliar_id === auxId) {
          return `Já alocado em ${p.label} neste turno`
        }
      }
    }
    return null
  }

  function getEscala(data:string, turnoLetra:string, posto:string): EscalaRow | undefined {
    // 1. Manual semanal override takes priority
    const manual = escalas.find(e => e.data===data && e.turno_letra===turnoLetra && e.posto===posto)
    if (manual) return manual
    // 2. Pre-computed assignment: one aux per posto, restrictions respected
    const ids = mensalAssignMap.get(`${data}|${turnoLetra}|${posto}`)
    const auxId = ids?.[0]
    if (!auxId) return undefined
    const me = mensalEntries.find(me => {
      if (me.auxiliar_id !== auxId || me.data !== data || !me.turno_id) return false
      const t = turnosData.find(t => t.id === me.turno_id)
      return !!(t && turnoToLetra(t) === turnoLetra)
    })
    if (!me) return undefined
    return { id:`mensal_${me.id}`, data, posto, turno_letra:turnoLetra, auxiliar_id:auxId, doutor_id:null }
  }
  function getFirstName(fullName: string): string {
    return fullName.split(" ")[0]
  }
  function getCellName(esc: EscalaRow|undefined) {
    if (!esc) return ""
    if (esc.doutor_id)   return getFirstName(doutores.find(d=>d.id===esc.doutor_id)?.nome ?? "")
    if (esc.auxiliar_id) return getFirstName(auxiliares.find(a=>a.id===esc.auxiliar_id)?.nome ?? "")
    return ""
  }
  // Retorna todas as escalas para uma célula (suporta TRANSPORT+M com 2 auxiliares)
  function getEscalas(data: string, turnoLetra: string, posto: string): EscalaRow[] {
    const manual = escalas.filter(e => e.data===data && e.turno_letra===turnoLetra && e.posto===posto)
    if (manual.length > 0) return manual
    const ids = mensalAssignMap.get(`${data}|${turnoLetra}|${posto}`) ?? []
    return ids.flatMap(auxId => {
      const me = mensalEntries.find(me => {
        if (me.auxiliar_id !== auxId || me.data !== data || !me.turno_id) return false
        const t = turnosData.find(t => t.id === me.turno_id)
        return !!(t && turnoToLetra(t) === turnoLetra)
      })
      if (!me) return []
      return [{ id: `mensal_${me.id}`, data, posto, turno_letra: turnoLetra, auxiliar_id: auxId, doutor_id: null }]
    })
  }
  function getCellDisplayName(data: string, turnoLetra: TurnoLetra, posto: PostoKey): string {
    const tipo = getPostoTipo(posto, turnoLetra)
    const isDocCell = tipo === "doutor"
    if (isMultiPerson(posto, turnoLetra)) {
      const rows = getEscalas(data, turnoLetra, posto)
      return rows.map(r => {
        const name = r.auxiliar_id ? (auxiliares.find(a=>a.id===r.auxiliar_id)?.nome ?? "") : ""
        return getFirstName(name)
      }).filter(Boolean).join("/")
    }
    const esc = getEscala(data, turnoLetra, posto)
    if (!esc) return ""
    if (isDocCell) {
      return doutores.find(d => d.id === esc.doutor_id)?.nome ?? ""
    }
    return getCellName(esc)
  }

  // ── Calcular Alertas Semanal ──────────────────────────────────────────
  interface AlertaSemanal {
    id: string
    tipo: "erro" | "aviso" | "info"
    categoria: "cobertura" | "conflito" | "outro"
    mensagem: string
    detalhe?: string
  }

  function calcularAlertasSemanal(): AlertaSemanal[] {
    const alertas: AlertaSemanal[] = []
    const cfg = horarios

    for (const data of weekDays.map(d => format(d, "yyyy-MM-dd"))) {
      const dayName = format(parseISO(data), "EEEE, d MMMM", { locale: ptBR })

      // Verificar cobertura por Posto + Turno
      for (const posto of POSTOS) {
        for (const turnoLetra of ["M", "T", "N"] as const) {
          if (!postoOpera(posto.key, turnoLetra, data)) continue

          const tipo = getPostoTipo(posto.key, turnoLetra)
          const isMulti = isMultiPerson(posto.key, turnoLetra)
          const maxPersons = getMaxPersons(posto.key, turnoLetra)
          const rows = getEscalas(data, turnoLetra, posto.key)
          const personIds = tipo === "doutor"
            ? rows.map(r => r.doutor_id).filter(Boolean)
            : rows.map(r => r.auxiliar_id).filter(Boolean)
          const uniquePersons = [...new Set(personIds)]

          if (uniquePersons.length === 0) {
            alertas.push({
              id: `alerta_${data}_${posto.key}_${turnoLetra}_vazio`,
              tipo: "erro",
              categoria: "cobertura",
              mensagem: `${dayName} — ${posto.label} sem cobertura no Turno ${turnoLetra}`,
              detalhe: tipo === "doutor" ? "Precisa de um doutor" : `Precisa de ${maxPersons} ${maxPersons === 1 ? "auxiliar" : "auxiliares"}`,
            })
          } else if (!isMulti && uniquePersons.length > 1) {
            alertas.push({
              id: `alerta_${data}_${posto.key}_${turnoLetra}_multi`,
              tipo: "aviso",
              categoria: "conflito",
              mensagem: `${dayName} — ${posto.label} Turno ${turnoLetra}: ${uniquePersons.length} pessoas (esperado 1)`,
            })
          } else if (isMulti && uniquePersons.length > maxPersons) {
            alertas.push({
              id: `alerta_${data}_${posto.key}_${turnoLetra}_excess`,
              tipo: "aviso",
              categoria: "conflito",
              mensagem: `${dayName} — ${posto.label} Turno ${turnoLetra}: ${uniquePersons.length} pessoas (máximo ${maxPersons})`,
            })
          } else if (isMulti && uniquePersons.length < maxPersons) {
            alertas.push({
              id: `alerta_${data}_${posto.key}_${turnoLetra}_deficit`,
              tipo: "info",
              categoria: "cobertura",
              mensagem: `${dayName} — ${posto.label} Turno ${turnoLetra}: apenas ${uniquePersons.length} de ${maxPersons} posições preenchidas`,
            })
          }
        }
      }
    }

    return alertas
  }

  // ── Dialog ────────────────────────────────────────────────────────────────
  function openCell(data:string, turnoLetra:TurnoLetra, posto:PostoKey) {
    const tipo = getPostoTipo(posto, turnoLetra)
    setSelCell({ data, turnoLetra, posto, tipo })
    if (isMultiPerson(posto, turnoLetra)) {
      const rows = getEscalas(data, turnoLetra, posto)
      setSelPersonIds(rows.map(r => r.auxiliar_id ?? "").filter(Boolean))
      setSelPersonId("")
      setSelOriginalId("")
    } else {
      const ex = getEscala(data, turnoLetra, posto)
      const preloadId = tipo==="doutor" ? (ex?.doutor_id??"") : (ex?.auxiliar_id??"")
      setSelPersonId(preloadId)
      setSelOriginalId(preloadId)
      setSelPersonIds([])
    }
    setSearch(""); setFilterTab("available"); setModalTouched(false); setDialogOpen(true)
    setTimeout(() => searchRef.current?.focus(), 60)
  }
  function closeDialog() {
    setDialogOpen(false); setSearch(""); setFilterTab("available")
    setSelOriginalId(""); setModalTouched(false)
  }

  async function saveEscala() {
    if (!selCell) return
    const isDouble = isMultiPerson(selCell.posto, selCell.turnoLetra)
    if (!isDouble && !selPersonId) return
    if (isDouble && selPersonIds.length === 0) return

    // ── Hard-block: aux não pode estar em 2+ postos no mesmo turno ──────────
    if (selCell.tipo === "auxiliar") {
      if (!isDouble && selPersonId) {
        const bReason = getAuxBlockReason(selPersonId, selCell.posto, selCell.turnoLetra, selCell.data)
        if (bReason) {
          const nome = auxiliares.find(a => a.id === selPersonId)?.nome ?? "Auxiliar"
          setToastMsg(`❌ ${nome} — ${bReason}. Não é possível guardar.`)
          setShowToast(true); setTimeout(() => setShowToast(false), 3500)
          return
        }
      }
      if (isDouble) {
        for (const auxId of selPersonIds) {
          const bReason = getAuxBlockReason(auxId, selCell.posto, selCell.turnoLetra, selCell.data)
          if (bReason) {
            const nome = auxiliares.find(a => a.id === auxId)?.nome ?? "Auxiliar"
            setToastMsg(`❌ ${nome} — ${bReason}. Não é possível guardar.`)
            setShowToast(true); setTimeout(() => setShowToast(false), 3500)
            return
          }
        }
      }
    }

    setSaving(true)

    if (isDouble) {
      // TRANSPORT+M: gerir até 2 auxiliares
      const existingRows = escalas.filter(e =>
        e.data===selCell.data && e.turno_letra===selCell.turnoLetra && e.posto===selCell.posto
      )
      const newIds = selPersonIds.filter(Boolean)
      // Apagar linhas removidas
      for (const row of existingRows) {
        if (row.auxiliar_id && !newIds.includes(row.auxiliar_id)) {
          await supabase.from("escalas").delete().eq("id", row.id)
          setEscalas(p => p.filter(e => e.id !== row.id))
        }
      }
      // Adicionar novas linhas
      const existingAuxIds = existingRows.map(r => r.auxiliar_id).filter(Boolean)
      for (const auxId of newIds) {
        if (!existingAuxIds.includes(auxId)) {
          const payload = { data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, tipo_escala:"semanal", status:"alocado", auxiliar_id:auxId, doutor_id:null }
          const { data:rows } = await supabase.from("escalas").insert(payload).select("id")
          if (rows?.length) {
            const nr: EscalaRow = { id:rows[0].id, ...payload }
            setEscalas(p => [...p, nr])
          }
        }
      }
      setSaving(false); closeDialog()
      setToastMsg("✅ Escala guardada com sucesso")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
      return
    }

    const ex = getEscala(selCell.data, selCell.turnoLetra, selCell.posto)
    // Only update if it's a real semanal record (not a derived mensal row)
    const realEx = ex && !ex.id.startsWith("mensal_") ? ex : undefined
    const payload = { data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, tipo_escala:"semanal", status:"alocado", auxiliar_id:selCell.tipo==="auxiliar"?selPersonId:null, doutor_id:selCell.tipo==="doutor"?selPersonId:null }
    let savedId: string|null = null
    if (realEx) { const {error}=await supabase.from("escalas").update(payload).eq("id",realEx.id); if(!error) savedId=realEx.id }
    else { const {data:rows,error}=await supabase.from("escalas").insert(payload).select("id"); if(!error&&rows?.length) savedId=rows[0].id }

    // ── Reverse sync: semanal override → upsert registo mensal correspondente ──
    if (savedId && selCell.tipo === "auxiliar") {
      // 1.º: match exacto por posto + letra; 2.º: fallback por letra (ex: N5 sem postos configurados)
      const matchedTurno = turnosData.find(t =>
        t.postos.includes(selCell.posto) && turnoToLetra(t) === selCell.turnoLetra
      ) ?? turnosData.find(t => turnoToLetra(t) === selCell.turnoLetra)
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
        // Actualiza estado local dos entries mensais para reflectir o sync imediatamente
        await refetchMensalEntries()
      }
    }

    setSaving(false); closeDialog()
    if (savedId) {
      const nr: EscalaRow = { id:savedId, data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, auxiliar_id:selCell.tipo==="auxiliar"?selPersonId:null, doutor_id:selCell.tipo==="doutor"?selPersonId:null }
      setEscalas(p => realEx ? p.map(e=>e.id===realEx.id?nr:e) : [...p,nr])
      setToastMsg("✅ Escala guardada com sucesso")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    } else {
      fetchAll()
      setToastMsg("❌ Erro ao guardar. Dados recarregados.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  async function clearEscala() {
    if (!selCell) return
    closeDialog()
    if (isMultiPerson(selCell.posto, selCell.turnoLetra)) {
      // Multi-person cell: delete all rows for this cell
      const rows = escalas.filter(e =>
        e.data===selCell.data && e.turno_letra===selCell.turnoLetra && e.posto===selCell.posto && !e.id.startsWith("mensal_")
      )
      setEscalas(p => p.filter(e => !rows.some(r => r.id === e.id)))
      for (const row of rows) await supabase.from("escalas").delete().eq("id", row.id)
      return
    }
    const ex = getEscala(selCell.data, selCell.turnoLetra, selCell.posto)
    // Only delete real semanal records; derived mensal rows cannot be deleted here
    if (ex && !ex.id.startsWith("mensal_")) {
      setEscalas(p=>p.filter(e=>e.id!==ex.id))
      const {error}=await supabase.from("escalas").delete().eq("id",ex.id)
      if(error) fetchAll()
      // Also remove the corresponding mensal entry for this aux+date
      const auxId = ex.auxiliar_id
      if (auxId) {
        const mensalEntry = mensalEntries.find(me => me.auxiliar_id === auxId && me.data === selCell.data)
        if (mensalEntry) {
          await supabase.from("escalas").delete().eq("id", mensalEntry.id)
          setMensalEntries(p => p.filter(me => me.id !== mensalEntry.id))
        }
      }
    }
  }

  // Remove a derivação do mensal apagando o registo mensal real
  async function clearDerivedOverride() {
    if (!selCell) return
    // Find the derived entry to get the aux id
    const ex = getEscala(selCell.data, selCell.turnoLetra, selCell.posto)
    const auxId = ex?.auxiliar_id
    closeDialog()
    if (auxId) {
      const mensalEntry = mensalEntries.find(me => me.auxiliar_id === auxId && me.data === selCell.data)
      if (mensalEntry) {
        await supabase.from("escalas").delete().eq("id", mensalEntry.id)
        setMensalEntries(p => p.filter(me => me.id !== mensalEntry.id))
      }
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

  // ── PDF / Print helpers ──────────────────────────────────────────────────
  // Shared style constants for PDF rendering
  const PDF_FONT = "'Segoe UI',Calibri,'Helvetica Neue',Arial,sans-serif"
  const PDF_BORDER = "1px solid #AAAAAA"

  // Returns a CSS inline style string for a header <th>
  function pdfTh(bg: string, extra = ""): string {
    return `font-family:${PDF_FONT};border:${PDF_BORDER};padding:5px 3px;background:${bg};font-size:8pt;font-weight:800;text-align:center;vertical-align:middle;color:#111;text-transform:uppercase;white-space:nowrap;${extra}`
  }
  // Returns a CSS inline style string for a data <td>
  function pdfTd(bg: string, extra = ""): string {
    return `font-family:${PDF_FONT};border:${PDF_BORDER};padding:4px 3px;background:${bg};font-size:7.5pt;font-weight:700;text-align:center;vertical-align:middle;color:#111;text-transform:uppercase;overflow:hidden;white-space:nowrap;${extra}`
  }

  // Builds the inner HTML content for the print window (all styles inline)
  function buildPDFContent(): string {
    // Paleta fiel à imagem de referência
    const SHIFT_C: Record<TurnoLetra,string> = { N:"#BDD7EE", M:"#C6EFCE", T:"#FFC000" }
    const DOC_C   = "#BFBFBF"   // células de doutor
    const SALA_C  = "#92D050"   // SALA 6/7 com pessoa
    const TRAN_C  = "#FFC000"   // TRANSPORT com pessoa
    const YEL     = "#FFEB9C"   // cabeçalho / rodapé amarelo
    const GRN     = "#92D050"   // cabeçalho grupo RX
    const ORA     = "#FFC000"   // cabeçalho Transportes

    // Formato do título idêntico ao PDF: "Escala semana D a D de Mês AAAA"
    const monthYear = format(weekDays[6],"MMMM yyyy",{locale:ptBR})
    const monthCap  = monthYear[0].toUpperCase() + monthYear.slice(1)
    const wt = `Escala semana ${format(weekDays[0],"d")} a ${format(weekDays[6],"d")} de ${monthCap}`

    // Larguras de coluna em px (≈ 1048px para A4 landscape com margens 6mm)
    const W: Record<string,string> = {
      day:"76px", turno:"30px",
      RX_URG:"121px", TAC2:"114px", TAC1:"102px",
      EXAM1:"125px", EXAM2:"129px",
      SALA6:"103px", SALA7:"102px",
      TRANSPORT:"148px",
    }

    let rows = ""
    for (const [di, day] of weekDays.entries()) {
      const ds = format(day, "yyyy-MM-dd")
      const dayLabel = `${format(day,"d")} - ${DIAS_PT[di]}`
      for (const [ti, turno] of TURNOS.entries()) {
        const shBg = SHIFT_C[turno as TurnoLetra]
        rows += "<tr>"
        if (ti === 0) {
          rows += `<td rowspan="3" style="${pdfTd("#FFFFFF",`font-size:9pt;font-weight:900;width:${W.day};`)}"><b>${dayLabel}</b></td>`
        }
        rows += `<td style="${pdfTd(shBg,`font-size:9pt;font-weight:900;width:${W.turno};`)}"><b>${turno}</b></td>`
        for (const p of POSTOS) {
          const opera   = postoOpera(p.key as PostoKey, turno as TurnoLetra, ds)
          const name    = opera ? getCellDisplayName(ds, turno as TurnoLetra, p.key as PostoKey) : ""
          const isDoc   = getPostoTipo(p.key as PostoKey, turno as TurnoLetra) === "doutor"
          let bg: string
          if (!opera)                                        bg = "#FFFFFF"
          else if (isDoc)                                    bg = DOC_C
          else if (p.key === "SALA6" || p.key === "SALA7")  bg = name ? SALA_C : "#FFFFFF"
          else if (p.key === "TRANSPORT")                    bg = name ? TRAN_C : "#FFFFFF"
          else                                               bg = shBg
          rows += `<td style="${pdfTd(bg,`width:${W[p.key]};${!name?"color:#BBBBBB;":""}`)}"><b>${name}</b></td>`
        }
        rows += "</tr>"
      }
      // separador fino entre dias
      if (di < 6) rows += `<tr style="height:3px;"><td colspan="10" style="background:#FFFFFF;padding:0;border:none;height:3px;"></td></tr>`
    }

    // rodapé com as 3 notas (fundo amarelo, bold, centrado)
    const noteStyle = `font-family:${PDF_FONT};border:1px solid #AAAAAA;padding:3px 6px;background:${YEL};font-size:7pt;font-weight:700;text-align:center;color:#111;`
    const notes = [
      "TURNO SALA 6 E T15 - TRANSPORTE DE DOENTES MARCADOS - LEITOS - HIGIENIZAÇÃO SERVIÇO - RENDER RX P/REFEIÇÃO - APOIAR COLEGAS SEMPRE QUE POSSIVEL SOLICITADO",
      "TURNO T15 SALA 7 - RENDE COLEGA DA TAC2 ÀS 18H30 E PERMANECE NA SALA ATÉ AO FECHO ÀS 20H30 - PÓS ESSA HORA VOLTA ÀS TAREFAS NORMAIS",
      "TURNO TR - TRANSPORTE DE TAC´S E ECO´S PROVENIENTES DO SUG.",
    ]
    const noteRows = notes.map(n => `<tr><td colspan="10" style="${noteStyle}">${n}</td></tr>`).join("")

    return `
<div style="font-family:${PDF_FONT};background:white;padding:0;width:1048px;">
  <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
    <colgroup>
      <col style="width:${W.day}"/>
      <col style="width:${W.turno}"/>
      <col style="width:${W.RX_URG}"/>
      <col style="width:${W.TAC2}"/>
      <col style="width:${W.TAC1}"/>
      <col style="width:${W.EXAM1}"/>
      <col style="width:${W.EXAM2}"/>
      <col style="width:${W.SALA6}"/>
      <col style="width:${W.SALA7}"/>
      <col style="width:${W.TRANSPORT}"/>
    </colgroup>
    <thead>
      <tr>
        <th colspan="10" style="${pdfTh("#FFFFFF","font-size:13pt;padding:6px 4px;")}"><span style="font-size:13pt;font-weight:900;color:#111;">${wt}</span></th>
      </tr>
      <tr>
        <th rowspan="2" style="${pdfTh(YEL,"width:"+W.day+";")}"></th>
        <th rowspan="2" style="${pdfTh(YEL,"width:"+W.turno+";")}"></th>
        <th rowspan="2" style="${pdfTh(YEL,"width:"+W.RX_URG+";")}">RX URG</th>
        <th rowspan="2" style="${pdfTh(YEL,"width:"+W.TAC2+";")}">TAC 2</th>
        <th rowspan="2" style="${pdfTh(YEL,"width:"+W.TAC1+";")}">TAC 1</th>
        <th colspan="2" rowspan="2" style="${pdfTh(YEL)}">Exames Complementares</th>
        <th colspan="2" style="${pdfTh(GRN)}">RX</th>
        <th rowspan="2" style="${pdfTh(ORA,"width:"+W.TRANSPORT+";font-size:7pt;")}">Transportes INT/URG</th>
      </tr>
      <tr>
        <th style="${pdfTh(GRN,"width:"+W.SALA6+";font-size:7pt;")}">SALA 6 BB</th>
        <th style="${pdfTh(GRN,"width:"+W.SALA7+";font-size:7pt;")}">SALA 7 EXT</th>
      </tr>
    </thead>
    <tbody>${rows}${noteRows}</tbody>
  </table>
</div>`
  }

  // ── Generate Table HTML (for printEscala standalone window) ───────────────
  function generateTableHTML() {
    const monthYear = format(weekDays[6],"MMMM yyyy",{locale:ptBR})
    const monthCap  = monthYear[0].toUpperCase() + monthYear.slice(1)
    const wt = `Escala semana ${format(weekDays[0],"d")} a ${format(weekDays[6],"d")} de ${monthCap}`
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${wt}</title>
  <style>
    @page { size: A4 landscape; margin: 6mm 8mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Calibri,Arial,sans-serif; background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  </style>
</head>
<body>
  ${buildPDFContent()}
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
    type n = number
    // ── Paleta exacta da imagem de referência ────────────────────────────────
    const WHT: [n,n,n] = [255,255,255]   // branco — título / dia / inactivo
    const YEL: [n,n,n] = [255,235,156]   // amarelo — cabeçalho e rodapé
    const GRN: [n,n,n] = [146,208, 80]   // verde — grupo RX e células SALA 6/7
    const ORA: [n,n,n] = [255,192,  0]   // âmbar — Transportes + turno T
    const DOC: [n,n,n] = [191,191,191]   // cinza — células de doutor
    const RED: [n,n,n] = [255, 80, 80]   // vermelho — célula com conflito
    const BLK: [n,n,n] = [  0,  0,  0]
    const GREY_TXT: [n,n,n] = [160,160,160]
    const SHFT: Record<TurnoLetra,[n,n,n]> = {
      N:[189,215,238],   // azul claro
      M:[198,239,206],   // verde claro
      T:[255,192,  0],   // âmbar (igual ao ORA)
    }

    // ── Larguras (total = 277mm = A4-landscape 297 − 2×10 margens) ───────────
    const CW = { dia:20, t:8, rxurg:32, tac2:30, tac1:27, e1:33, e2:34, s6:27, s7:27, tr:39 }
    // 20+8+32+30+27+33+34+27+27+39 = 277 ✓

    // helper de estilos de célula de cabeçalho
    const H = (fill: [n,n,n], fs = 9, extra: object = {}) => ({
      fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
      fillColor:fill, fontSize:fs, textColor:BLK, cellPadding:2.5, ...extra,
    })

    // ── Título (formato da imagem: "Escala semana 16 a 22 Março 2026") ────────
    const monthYear = format(weekDays[6],"MMMM yyyy",{locale:ptBR})
    const monthCap  = monthYear[0].toUpperCase() + monthYear.slice(1)
    const titleText = `Escala semana ${format(weekDays[0],"d")} a ${format(weekDays[6],"d")} de ${monthCap}`

    // ── Cabeçalho (3 linhas: título + grupos + sub-grupos) ────────────────────
    const head = [
      // linha 0 — título full-width, fundo branco, texto grande e bold
      [{ content:titleText, colSpan:10,
         styles:{ fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
                  fillColor:WHT, fontSize:14, textColor:BLK, cellPadding:4 } }],
      // linha 1 — grupos de colunas
      [
        { content:"",                       rowSpan:2, styles:H(YEL) },
        { content:"",                       rowSpan:2, styles:H(YEL) },
        { content:"RX URG",                 rowSpan:2, styles:H(YEL,9) },
        { content:"TAC 2",                  rowSpan:2, styles:H(YEL,9) },
        { content:"TAC 1",                  rowSpan:2, styles:H(YEL,9) },
        { content:"Exames Complementares",  colSpan:2, rowSpan:2, styles:H(YEL,9) },
        { content:"RX",                     colSpan:2, styles:H(GRN,9) },
        { content:"Transportes\nINT/URG",   rowSpan:2, styles:H(ORA,8) },
      ],
      // linha 2 — sub-grupos RX
      [
        { content:"SALA 6 BB",  styles:H(GRN,8) },
        { content:"SALA 7 EXT", styles:H(GRN,8) },
      ],
    ]

    // ── Corpo ─────────────────────────────────────────────────────────────────
    const body: any[] = []

    for (const [di, day] of weekDays.entries()) {
      const ds = format(day,"yyyy-MM-dd")
      const dayLabel = `${format(day,"d")} - ${DIAS_PT[di]}`

      for (const [ti, turno] of TURNOS.entries()) {
        const shRgb = SHFT[turno as TurnoLetra]
        const row: any[] = []

        // célula do dia (rowspan 3, fundo branco, texto bold)
        if (ti === 0) {
          row.push({ content:dayLabel, rowSpan:3,
            styles:{ fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
                     fillColor:WHT, fontSize:8.5, textColor:BLK } })
        }
        // célula do turno (cor do shift)
        row.push({ content:turno,
          styles:{ fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
                   fillColor:shRgb, fontSize:9, textColor:BLK } })

        // células de posto
        for (const p of POSTOS) {
          const opera    = postoOpera(p.key as PostoKey, turno as TurnoLetra, ds)
          const name     = opera ? getCellDisplayName(ds, turno as TurnoLetra, p.key as PostoKey) : ""
          const isDoc    = getPostoTipo(p.key as PostoKey, turno as TurnoLetra) === "doutor"
          const isDouble = isMultiPerson(p.key as PostoKey, turno as TurnoLetra)
          const esc      = opera && !isDouble ? getEscala(ds, turno as TurnoLetra, p.key as PostoKey) : undefined
          const conflict = !!(esc as any)?.conflito

          let bg: [n,n,n]
          if (!opera)                                        bg = WHT
          else if (conflict)                                 bg = RED
          else if (isDoc)                                    bg = DOC
          else if (p.key === "SALA6" || p.key === "SALA7")  bg = name ? GRN : WHT
          else if (p.key === "TRANSPORT")                    bg = name ? ORA : WHT
          else                                               bg = shRgb

          row.push({ content:name,
            styles:{ fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
                     fillColor:bg, fontSize:8,
                     textColor: conflict ? WHT : (name ? BLK : GREY_TXT) } })
        }
        body.push(row)
      }

      // separador fino entre dias (branco, 1 mm)
      if (di < 6) {
        body.push(Array.from({length:10}, () =>
          ({ content:"", styles:{ fillColor:WHT, minCellHeight:1, cellPadding:0 } })
        ))
      }
    }

    // ── Rodapé — 3 linhas com notas (fundo amarelo, texto bold centrado) ──────
    const notes = [
      "TURNO SALA 6 E T15 - TRANSPORTE DE DOENTES MARCADOS - LEITOS - HIGIENIZAÇÃO SERVIÇO - RENDER RX P/REFEIÇÃO - APOIAR COLEGAS SEMPRE QUE POSSIVEL SOLICITADO",
      "TURNO T15 SALA 7 - RENDE COLEGA DA TAC2 ÀS 18H30 E PERMANECE NA SALA ATÉ AO FECHO ÀS 20H30 - PÓS ESSA HORA VOLTA ÀS TAREFAS NORMAIS",
      "TURNO TR - TRANSPORTE DE TAC´S E ECO´S PROVENIENTES DO SUG.",
    ]
    for (const note of notes) {
      body.push([{ content:note, colSpan:10,
        styles:{ fontStyle:"bold" as const, halign:"center" as const, valign:"middle" as const,
                 fillColor:YEL, fontSize:7, textColor:BLK, cellPadding:2 } }])
    }

    // ── Render (tabela no topo → 1 única página garantida) ───────────────────
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
    autoTable(doc, {
      head, body,
      startY: 4,   // topo da página — evita overflow para 2.ª página
      margin: { left:10, right:10 },
      tableWidth: 277,
      styles: {
        fontSize:8, cellPadding:1.8, overflow:"ellipsize",
        valign:"middle", halign:"center",
        lineWidth:0.22, lineColor:[160,160,160] as [n,n,n],
      },
      headStyles: { fontStyle:"bold", cellPadding:2 },
      columnStyles: {
        0: { cellWidth:CW.dia   },
        1: { cellWidth:CW.t     },
        2: { cellWidth:CW.rxurg },
        3: { cellWidth:CW.tac2  },
        4: { cellWidth:CW.tac1  },
        5: { cellWidth:CW.e1    },
        6: { cellWidth:CW.e2    },
        7: { cellWidth:CW.s6    },
        8: { cellWidth:CW.s7    },
        9: { cellWidth:CW.tr    },
      },
      theme: "grid",
    })
    doc.save(`Escala_Semanal_${format(weekDays[0],"yyyy-MM-dd")}.pdf`)
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
  const isDouble    = selCell ? isMultiPerson(selCell.posto, selCell.turnoLetra) : false
  const maxPersons  = selCell ? getMaxPersons(selCell.posto as PostoKey, selCell.turnoLetra as TurnoLetra) : 1
  const personList: Person[] = selCell?.tipo==="doutor" ? doutores : auxiliares
  const searchFiltered = personList.filter(p=>p.nome.toLowerCase().includes(search.toLowerCase()))
  const auxBlockReasons = new Map<string, string | null>(
    searchFiltered.map(p => [
      p.id,
      (selCell && selCell.tipo !== "doutor")
        ? getAuxBlockReason(p.id, selCell.posto, selCell.turnoLetra, selCell.data)
        : null
    ])
  )
  const availableList = searchFiltered.filter(p => {
    if (!selCell) return true
    if (auxTemRestricao(p.id, selCell.posto, selCell.turnoLetra, selCell.data)) return false
    if (getAusenciaCode(p.id, selCell.data)) return false
    if (auxBlockReasons.get(p.id)) return false  // bloqueios operacionais → separador Restrições
    return true
  })
  const restrictedList = searchFiltered.filter(p => {
    if (!selCell) return false
    return auxTemRestricao(p.id, selCell.posto, selCell.turnoLetra, selCell.data) ||
      !!getAusenciaCode(p.id, selCell.data) ||
      !!auxBlockReasons.get(p.id)  // inclui bloqueios operacionais (N→M, duplo posto)
  })
  const allocatedTodayList = selCell
    ? searchFiltered.filter(p =>
        escalas.some(e => e.auxiliar_id === p.id && e.data === selCell.data) ||
        mensalEntries.some(me => me.auxiliar_id === p.id && me.data === selCell.data)
      )
    : []
  const baseFiltered = filterTab === "available" ? availableList
    : filterTab === "restricted" ? restrictedList
    : allocatedTodayList
  // Blocked (operacional) shown last within each tab
  const filtered = [...baseFiltered].sort((a, b) =>
    Number(!!(auxBlockReasons.get(a.id))) - Number(!!(auxBlockReasons.get(b.id)))
  )
  const posto      = selCell ? postoInfo(selCell.posto) : null
  const accentBg   = posto?.bg==="#FFFFFF" ? "#4A90A4" : (posto?.bg ?? "#4A90A4")
  const dayIdx     = selCell ? weekDays.findIndex(d=>format(d,"yyyy-MM-dd")===selCell.data) : -1
  const dayLabel   = dayIdx>=0 ? `${format(weekDays[dayIdx],"d")} ${DIAS_PT[dayIdx]}` : ""
  const _existingEsc = selCell && !isDouble ? getEscala(selCell.data,selCell.turnoLetra,selCell.posto) : undefined
  // Show "Limpar" only for real semanal records; derived mensal rows cannot be cleared here
  const hasExisting = isDouble
    ? escalas.some(e => e.data===selCell?.data && e.turno_letra===selCell?.turnoLetra && e.posto===selCell?.posto && !e.id.startsWith("mensal_"))
    : !!(_existingEsc && !_existingEsc.id.startsWith("mensal_"))
  const isDerived   = !isDouble && !!(_existingEsc?.id?.startsWith("mensal_"))

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

          {/* Alertas */}
          {(() => {
            const alertasCount = !loading ? calcularAlertasSemanal() : []
            const erroCount = alertasCount.filter(a => a.tipo === "erro").length
            const avisoCount = alertasCount.filter(a => a.tipo === "aviso").length
            return (
              <button
                onClick={() => { setAlertasTipo("all"); setAlertasDia(null); setAlertasModalOpen(true) }}
                disabled={loading}
                style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"5px 12px",borderRadius:8,border:"1px solid",cursor:loading?"not-allowed":"pointer",
                  fontSize:13,fontWeight:600,transition:"all 0.15s",
                  borderColor: erroCount > 0 ? "#FCA5A5" : avisoCount > 0 ? "#FCD34D" : "#D1D5DB",
                  background: erroCount > 0 ? "#FEF2F2" : avisoCount > 0 ? "#FFFBEB" : "#F9FAFB",
                  color: erroCount > 0 ? "#DC2626" : avisoCount > 0 ? "#92400E" : "#6B7280",
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.filter="brightness(0.95)")}
                onMouseLeave={e => (e.currentTarget.style.filter="brightness(1)")}
              >
                <AlertCircle size={15}/>
                Alertas
                {erroCount > 0 && (
                  <span style={{background:"#DC2626",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:11,fontWeight:700,lineHeight:"16px"}}>{erroCount}</span>
                )}
                {erroCount === 0 && avisoCount > 0 && (
                  <span style={{background:"#F59E0B",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:11,fontWeight:700,lineHeight:"16px"}}>{avisoCount}</span>
                )}
              </button>
            )
          })()}

          {/* Dropdown Export */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={()=>setExportMenuOpen(!exportMenuOpen)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <MoreVertical className="h-4 w-4"/> Exportar
            </Button>
            {exportMenuOpen && (
              <>
                <div style={{position:"fixed",inset:0}} onClick={()=>setExportMenuOpen(false)}/>
                <div style={{
                  position:"absolute",
                  top:"100%",
                  right:0,
                  marginTop:6,
                  background:"#fff",
                  border:"1px solid #E5E7EB",
                  borderRadius:8,
                  boxShadow:"0 10px 24px rgba(0,0,0,0.12)",
                  zIndex:50,
                  minWidth:180,
                  overflow:"hidden",
                }}>
                  <button
                    onClick={()=>{printEscala();setExportMenuOpen(false)}}
                    style={{
                      width:"100%",padding:"10px 14px",textAlign:"left",border:"none",background:"none",
                      cursor:"pointer",fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:10,
                      borderBottom:"1px solid #F3F4F6",transition:"background 0.2s",
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#F9FAFB")}
                    onMouseLeave={e=>(e.currentTarget.style.background="none")}
                  >
                    <Printer size={16}/> Imprimir
                  </button>
                  <button
                    onClick={()=>{exportPDF();setExportMenuOpen(false)}}
                    style={{
                      width:"100%",padding:"10px 14px",textAlign:"left",border:"none",background:"none",
                      cursor:"pointer",fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:10,
                      borderBottom:"1px solid #F3F4F6",transition:"background 0.2s",
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#F9FAFB")}
                    onMouseLeave={e=>(e.currentTarget.style.background="none")}
                  >
                    <FileDown size={16}/> Baixar PDF
                  </button>
                  <button
                    onClick={()=>{shareWA();setExportMenuOpen(false)}}
                    disabled={sharingWA}
                    style={{
                      width:"100%",padding:"10px 14px",textAlign:"left",border:"none",background:"none",
                      cursor:sharingWA?"not-allowed":"pointer",fontSize:13,color:sharingWA?"#D1D5DB":"#10B981",
                      display:"flex",alignItems:"center",gap:10,transition:"background 0.2s",opacity:sharingWA?0.6:1,
                    }}
                    onMouseEnter={e=>!sharingWA&&(e.currentTarget.style.background="#F0FDF4")}
                    onMouseLeave={e=>(e.currentTarget.style.background="none")}
                  >
                    {sharingWA ? <Loader size={16} className="animate-spin"/> : <MessageCircle size={16}/>}
                    {sharingWA?"Enviando...":"WhatsApp"}
                  </button>
                </div>
              </>
            )}
          </div>
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

      {/* Banner de filtro por auxiliar */}
      {highlightAuxId && (
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 14px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,fontSize:13,color:"#1D4ED8" }}>
          <span>👤</span>
          <span>A mostrar turnos de <strong>{highlightAuxNome ?? "auxiliar"}</strong> — as células destacadas a azul correspondem às suas atribuições</span>
          <button onClick={()=>{ setHighlightAuxId(null); setHighlightAuxNome(null) }} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#6B7280",display:"flex",alignItems:"center" }} title="Limpar filtro"><X size={15}/></button>
        </div>
      )}

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
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>TAC 2</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>TAC 1</th>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#FFD700" }}>Exames Complementares</th>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#FFD700" }}>RX</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>Transportes<br/>INT/URG</th>
                </tr>
                <tr style={{ background: "#f0f0f0" }}>
                  <th colSpan={2} style={{ ...thBase, backgroundColor: "#D9D9D9" }}/>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}/>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}/>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}/>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>Eco Urg</th>
                  <th style={{ ...thBase, backgroundColor: "#FFD700" }}>Eco Complementar</th>
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
                      const isDouble = isMultiPerson(p.key as PostoKey, turno)
                      const isDocCell = getPostoTipo(p.key as PostoKey, turno) === "doutor"
                      const esc = opera && !isDouble ? getEscala(dateStr,turno,p.key) : undefined
                      const derived = esc?.id?.startsWith("mensal_")
                      const cellName = opera
                        ? getCellDisplayName(dateStr, turno, p.key as PostoKey)
                        : ""
                      const temRestr = esc?.auxiliar_id
                        ? auxTemRestricao(esc.auxiliar_id, p.key, turno, dateStr)
                        : false
                      const isEmpty = opera && !cellName
                      const placeholder = isDocCell && isEmpty ? "Dr. ?" : ""
                      // Highlight se este posto tem o auxiliar filtrado (single ou multi)
                      const isHighlighted = highlightAuxId && (
                        esc?.auxiliar_id === highlightAuxId ||
                        (isDouble && getEscalas(dateStr, turno, p.key as PostoKey).some(r => r.auxiliar_id === highlightAuxId))
                      )
                      return(
                        <td key={p.key}
                          onClick={opera ? ()=>openCell(dateStr,turno,p.key as PostoKey) : undefined}
                          title={!opera
                            ? "Posto não opera neste turno/dia"
                            : cellName
                              ? `${cellName}${derived?" (da escala mensal)":""}${temRestr?" ⚠️ restrição ativa":""}`
                              : isDocCell ? "Clique para atribuir Doutor" : "Clique para atribuir"}
                          style={{ ...cellBase,
                            backgroundColor: isHighlighted ? "#DBEAFE" : !opera ? "#E5E7EB" : p.bg,
                            opacity: !opera ? 0.5 : 1,
                            fontStyle: placeholder ? "italic" : "normal",
                            color: placeholder ? "#9CA3AF" : "inherit",
                            cursor: !opera ? "not-allowed" : "pointer",
                            border: temRestr ? "2px solid #EF4444" : isHighlighted ? "2px solid #3B82F6" : B,
                            boxShadow: isHighlighted ? "inset 0 0 0 1px #93C5FD" : undefined }}
                          onMouseEnter={opera ? e=>(e.currentTarget.style.filter="brightness(0.91)") : undefined}
                          onMouseLeave={opera ? e=>(e.currentTarget.style.filter="brightness(1)") : undefined}>
                          {opera ? (cellName || placeholder || "") : "—"}
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
                <input ref={searchRef} type="text" value={search} onChange={e=>{ setSearch(e.target.value); setModalTouched(true) }}
                  placeholder={`Pesquisar ${selCell?.tipo==="doutor"?"doutor(a)":"auxiliar"}…`}
                  style={{ border:"none",background:"transparent",outline:"none",fontSize:"13px",width:"100%",color:"#1A1A2E" }}/>
                {search && <button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}><X size={13} color="#AAA"/></button>}
              </div>
            </div>

            {/* Filter tabs */}
            {selCell?.tipo !== "doutor" && (
              <div style={{ display:"flex",gap:"6px",padding:"8px 20px 0" }}>
                <button
                  onClick={()=>{ setFilterTab("available"); setModalTouched(true) }}
                  style={{ flex:1,padding:"6px 0",borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,transition:"all 0.15s",
                    background:filterTab==="available"?"#1A3A4A":"#F4F4F4",
                    color:filterTab==="available"?"#FFF":"#555" }}>
                  Disponíveis ({availableList.length})
                </button>
                <button
                  onClick={()=>{ setFilterTab("allocated"); setModalTouched(true) }}
                  style={{ flex:1,padding:"6px 0",borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,transition:"all 0.15s",
                    background:filterTab==="allocated"?"#B45309":"#F4F4F4",
                    color:filterTab==="allocated"?"#FFF":"#555" }}>
                  Alocados hoje ({allocatedTodayList.length})
                </button>
                <button
                  onClick={()=>{ setFilterTab("restricted"); setModalTouched(true) }}
                  style={{ flex:1,padding:"6px 0",borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,transition:"all 0.15s",
                    background:filterTab==="restricted"?"#DC2626":"#F4F4F4",
                    color:filterTab==="restricted"?"#FFF":"#555" }}>
                  Com restrição ({restrictedList.length})
                </button>
              </div>
            )}

            {/* Info for multi-person cells */}
            {isDouble && selCell && (
              <div style={{ margin:"0 20px 8px",padding:"6px 10px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:"8px",fontSize:"11px",color:"#1E40AF" }}>
                {selCell.posto === "TRANSPORT"
                  ? "Selecione até 2 auxiliares para Transportes — Manhã"
                  : selCell.posto === "EXAM1"
                    ? "Selecione até 2 auxiliares para ECO URG"
                    : `Selecione até ${maxPersons} auxiliares para Exames Comp. (2) — Manhã`}
              </div>
            )}

            {/* List */}
            <div style={{ maxHeight:"300px",overflowY:"auto",padding:"8px" }}>
              {filtered.length===0 ? (
                <div style={{ padding:"24px 16px",textAlign:"center",fontSize:"13px",color:"#AAA" }}>
                  {personList.length===0
                    ? `Nenhum ${selCell?.tipo==="doutor"?"doutor":"auxiliar"} cadastrado.`
                    : filterTab==="available"
                      ? "Nenhum auxiliar disponível neste turno."
                      : filterTab==="restricted"
                        ? "Nenhum auxiliar com restrição encontrado."
                        : "Nenhum auxiliar alocado hoje."}
                </div>
              ) : filtered.map(p=>{
                const isSel = isDouble ? selPersonIds.includes(p.id) : selPersonId===p.id
                const isDisabledMulti = isDouble && !isSel && selPersonIds.length >= maxPersons
                const blockReason = auxBlockReasons.get(p.id) ?? null
                const ausCode = selCell ? getAusenciaCode(p.id, selCell.data) : null
                const ausLabel = ausCode ? `${ABSENCE_LABELS[ausCode] ?? ausCode} (${ausCode})` : null
                const isBlocked = !!blockReason || !!ausLabel
                const isDisabledFinal = isBlocked || isDisabledMulti
                const pRestr = selCell
                  ? auxTemRestricao(p.id, selCell.posto, selCell.turnoLetra, selCell.data)
                  : false
                function handleClick() {
                  if (isDouble) {
                    setSelPersonIds(prev =>
                      prev.includes(p.id) ? prev.filter(id=>id!==p.id) : prev.length < maxPersons ? [...prev, p.id] : prev
                    )
                  } else {
                    setSelPersonId(isSel ? "" : p.id)
                  }
                }
                return(
                  <button key={p.id} onClick={isDisabledFinal ? undefined : handleClick} disabled={isDisabledFinal}
                    style={{ width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"9px 12px",borderRadius:"10px",border:"none",cursor:isDisabledFinal?"not-allowed":"pointer",textAlign:"left",backgroundColor:isSel?"#EBF4F8":"transparent",transition:"background-color 0.12s",opacity:isBlocked?0.45:isDisabledMulti?0.4:1 }}
                    onMouseEnter={e=>{ if(!isSel&&!isDisabledFinal) e.currentTarget.style.backgroundColor="#F7F8FA" }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.backgroundColor="transparent" }}>
                    <div style={{ width:"36px",height:"36px",borderRadius:"10px",backgroundColor:isSel?accentBg:isBlocked?"#F3F4F6":"#E8EEF2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,flexShrink:0,color:isSel?"#FFFFFF":isBlocked?"#9CA3AF":"#5A7080",transition:"all 0.12s" }}>{getInitials(p.nome)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"13px",fontWeight:isSel?600:500,color:isSel?"#1A3A4A":isBlocked?"#9CA3AF":"#333" }}>{p.nome}</div>
                      {blockReason && <div style={{ fontSize:"10px",color:"#EF4444",marginTop:"1px" }}>{blockReason}</div>}
                      {ausLabel && !blockReason && <div style={{ fontSize:"10px",color:"#7C3AED",marginTop:"1px" }}>Ausência: {ausLabel}</div>}
                    </div>
                    {pRestr && !isBlocked && <span title="Restrição ativa para este posto/turno" style={{ fontSize:"14px" }}>⚠️</span>}
                    {isBlocked && <span title={blockReason ?? ausLabel ?? ""} style={{ fontSize:"14px" }}>🔒</span>}
                    {isSel && <div style={{ width:"22px",height:"22px",borderRadius:"50%",backgroundColor:accentBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Check size={13} color="#FFF" strokeWidth={2.5}/></div>}
                  </button>
                )
              })}
            </div>

            {/* Warning banners — bloqueio operacional ou restrição de política */}
            {!isDouble && selPersonId && selCell && (() => {
              const isChanged = selPersonId !== selOriginalId
              const bReason = getAuxBlockReason(selPersonId, selCell.posto, selCell.turnoLetra, selCell.data)
              const hasRestr = auxTemRestricao(selPersonId, selCell.posto, selCell.turnoLetra, selCell.data)
              const auxNome = auxiliares.find(a => a.id === selPersonId)?.nome ?? "Auxiliar"
              // Só mostrar bloqueio quando o aux foi alterado (evita ruído para o aux já atribuído)
              if (bReason && isChanged) return (
                <div style={{ margin:"0 20px",padding:"8px 12px",background:"#FEE2E2",border:"1px solid #FCA5A5",borderRadius:"8px",fontSize:"12px",color:"#991B1B",display:"flex",alignItems:"center",gap:"6px" }}>
                  🔒 {bReason} — <strong>{auxNome}</strong> não pode ser alocado neste turno.
                </div>
              )
              if (hasRestr && isChanged) {
                const tipoRestr = getRestricaoDescricao(selPersonId, selCell.posto, selCell.turnoLetra, selCell.data)
                return (
                  <div style={{ margin:"0 20px",padding:"8px 12px",background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:"8px",fontSize:"12px",color:"#92400E",display:"flex",alignItems:"center",gap:"6px" }}>
                    ⚠️ <strong>{auxNome}</strong> tem {tipoRestr} — verifique antes de guardar.
                  </div>
                )
              }
              return null
            })()}

            {/* Footer */}
            <div style={{ padding:"14px 20px 20px",borderTop:"1px solid #F0F0F0",display:"flex",gap:"8px",justifyContent:"flex-end",alignItems:"center",flexWrap:"wrap" }}>
              {/* Hint when nothing selected and user has interacted */}
              {modalTouched && !isDouble && !selPersonId && selCell?.tipo !== "doutor" && (
                <span style={{ marginRight:"auto",fontSize:"11px",color:"#9CA3AF" }}>↑ Selecione um auxiliar para guardar</span>
              )}
              {/* Remove existing semanal entry */}
              {hasExisting && (
                <button onClick={clearEscala} style={{ marginRight:"auto",background:"none",border:"1.5px solid #FFCDD2",borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"#E57373",transition:"all 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#FFF5F5";e.currentTarget.style.borderColor="#E57373"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="#FFCDD2"}}>Remover</button>
              )}
              {/* Remove mensal-derived entry via override */}
              {isDerived && !hasExisting && !isDouble && (
                <button onClick={clearDerivedOverride} style={{ marginRight:"auto",background:"none",border:"1.5px solid #FED7AA",borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"#C2410C",transition:"all 0.12s" }}
                  title="Cria override para anular a derivação do mensal"
                  onMouseEnter={e=>{e.currentTarget.style.background="#FFF7ED";e.currentTarget.style.borderColor="#C2410C"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="#FED7AA"}}>Remover (mensal)</button>
              )}
              {isDouble && selPersonIds.length > 0 && (
                <button onClick={()=>setSelPersonIds([])} style={{ background:"none",border:"1.5px solid #FFCDD2",borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"#E57373",transition:"all 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#FFF5F5";e.currentTarget.style.borderColor="#E57373"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="#FFCDD2"}}>Limpar</button>
              )}
              <button onClick={closeDialog} style={{ background:"#F4F4F4",border:"none",borderRadius:"8px",padding:"7px 16px",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"#555",transition:"background 0.12s" }}
                onMouseEnter={e=>(e.currentTarget.style.background="#E8E8E8")} onMouseLeave={e=>(e.currentTarget.style.background="#F4F4F4")}>Cancelar</button>
              {(() => {
                const canSave = isDouble ? selPersonIds.length > 0 : !!selPersonId
                return (
                  <button onClick={saveEscala} disabled={saving || !canSave}
                    style={{ background:canSave?"#1A3A4A":"#CCC",border:"none",borderRadius:"8px",padding:"7px 20px",cursor:canSave?"pointer":"not-allowed",fontSize:"12px",fontWeight:700,color:"#FFF",letterSpacing:"0.02em",transition:"background 0.12s" }}
                    onMouseEnter={e=>{if(canSave)e.currentTarget.style.background="#2A5A74"}}
                    onMouseLeave={e=>{if(canSave)e.currentTarget.style.background="#1A3A4A"}}>
                    {saving ? "A guardar…" : "Guardar"}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alertas */}
      {alertasModalOpen && (() => {
        const todosAlerts = calcularAlertasSemanal()
        const erros  = todosAlerts.filter(a => a.tipo === "erro")
        const avisos = todosAlerts.filter(a => a.tipo === "aviso")
        const infos  = todosAlerts.filter(a => a.tipo === "info")

        // Filter by tipo
        const byTipo = alertasTipo === "all" ? todosAlerts
          : alertasTipo === "erro" ? erros
          : alertasTipo === "aviso" ? avisos : infos

        // Filter by dia (extract day from message)
        const displayed = alertasDia
          ? byTipo.filter(a => {
              const ds = format(parseISO(alertasDia), "EEEE, d MMMM", { locale: ptBR })
              return a.mensagem.startsWith(ds)
            })
          : byTipo

        const tipoBtn = (tipo: typeof alertasTipo, label: string, count: number, color: string, bg: string) => (
          <button
            key={tipo}
            onClick={() => setAlertasTipo(tipo)}
            style={{
              padding:"5px 11px",borderRadius:20,border:"none",cursor:"pointer",
              fontSize:12,fontWeight:600,transition:"all 0.15s",whiteSpace:"nowrap",
              background: alertasTipo === tipo ? color : "#F3F4F6",
              color: alertasTipo === tipo ? "#fff" : "#6B7280",
            }}
          >
            {label} {count > 0 && <span style={{
              display:"inline-block",background: alertasTipo === tipo ? "rgba(255,255,255,0.3)" : bg,
              color: alertasTipo === tipo ? "#fff" : color,
              borderRadius:10,padding:"0 5px",fontSize:11,fontWeight:700,marginLeft:3,
            }}>{count}</span>}
          </button>
        )

        const ALERT_STYLE: Record<string, {border:string;bg:string;leftBar:string;titleColor:string}> = {
          erro:  {border:"#FECACA",bg:"#FEF2F2",leftBar:"#EF4444",titleColor:"#991B1B"},
          aviso: {border:"#FDE68A",bg:"#FFFBEB",leftBar:"#F59E0B",titleColor:"#92400E"},
          info:  {border:"#BFDBFE",bg:"#EFF6FF",leftBar:"#3B82F6",titleColor:"#1E40AF"},
        }
        const ALERT_ICON: Record<string, string> = { erro:"🚨", aviso:"⚠️", info:"ℹ️" }

        return (
          <>
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:59,animation:"fadeIn 0.2s ease"}} onClick={()=>setAlertasModalOpen(false)}/>
            <div style={{
              position:"fixed",top:0,right:0,bottom:0,width:400,maxWidth:"100vw",
              background:"#fff",boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",zIndex:60,
              display:"flex",flexDirection:"column",animation:"slideLeftIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {/* Header — dark with gradient */}
              <div style={{
                background:"linear-gradient(135deg,#1A2E44 0%,#1e3a5f 100%)",
                padding:"18px 20px 16px",flex:"0 0 auto",
              }}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                  <div>
                    <h3 style={{fontWeight:800,fontSize:17,color:"#fff",margin:"0 0 2px"}}>Alertas da Semana</h3>
                    <p style={{fontSize:12,color:"rgba(255,255,255,0.55)",margin:0}}>
                      {format(weekDays[0],"d",{locale:ptBR})} – {format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}
                    </p>
                  </div>
                  <button onClick={()=>setAlertasModalOpen(false)} style={{background:"rgba(255,255,255,0.12)",border:"none",cursor:"pointer",padding:"6px",borderRadius:8,color:"#fff",lineHeight:0,marginLeft:8,flexShrink:0}}><X size={16}/></button>
                </div>
                {/* Stats summary */}
                <div style={{display:"flex",gap:8}}>
                  {[
                    {count:erros.length,  label:"Erros",  bg:"#EF4444"},
                    {count:avisos.length, label:"Avisos", bg:"#F59E0B"},
                    {count:infos.length,  label:"Infos",  bg:"#3B82F6"},
                  ].map(({count,label,bg}) => (
                    <div key={label} style={{flex:1,background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 10px",textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:800,color: count > 0 ? bg : "rgba(255,255,255,0.3)",lineHeight:1}}>{count}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2,letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div style={{padding:"12px 16px 8px",borderBottom:"1px solid #F0F0F0",flex:"0 0 auto",background:"#FAFAFA"}}>
                {/* Tipo pills */}
                <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:2}}>
                  {tipoBtn("all",  "Todos",  todosAlerts.length, "#374151","#E5E7EB")}
                  {tipoBtn("erro", "Erros",  erros.length,       "#DC2626", "#FEE2E2")}
                  {tipoBtn("aviso","Avisos", avisos.length,      "#D97706", "#FEF3C7")}
                  {tipoBtn("info", "Info",   infos.length,       "#2563EB", "#DBEAFE")}
                </div>
                {/* Dia pills */}
                <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
                  <button
                    onClick={() => setAlertasDia(null)}
                    style={{padding:"3px 10px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",
                      background: alertasDia === null ? "#1A2E44" : "#F3F4F6",
                      color: alertasDia === null ? "#fff" : "#6B7280",transition:"all 0.12s"}}
                  >
                    Todos os dias
                  </button>
                  {weekDays.map((day, i) => {
                    const ds = format(day, "yyyy-MM-dd")
                    const label = `${DIAS_PT[i]} ${format(day,"d")}`
                    const active = alertasDia === ds
                    return (
                      <button key={ds} onClick={() => setAlertasDia(active ? null : ds)}
                        style={{padding:"3px 9px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",
                          background: active ? "#1A2E44" : "#F3F4F6",
                          color: active ? "#fff" : "#6B7280",transition:"all 0.12s"}}
                      >{label}</button>
                    )
                  })}
                </div>
              </div>

              {/* Body */}
              <div style={{overflowY:"auto",flex:1,padding:"14px 16px"}}>
                {displayed.length === 0 ? (
                  <div style={{textAlign:"center",padding:"48px 16px"}}>
                    <div style={{fontSize:36,marginBottom:10}}>✅</div>
                    <div style={{fontWeight:700,fontSize:14,color:"#374151"}}>
                      {todosAlerts.length === 0 ? "Escala completa!" : "Sem alertas nesta seleção"}
                    </div>
                    <div style={{fontSize:12,color:"#9CA3AF",marginTop:4}}>
                      {todosAlerts.length === 0 ? "Todos os postos estão cobertos." : "Tente mudar os filtros acima."}
                    </div>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {displayed.map(a => {
                      const s = ALERT_STYLE[a.tipo]
                      return (
                        <div key={a.id} style={{
                          borderRadius:10,border:`1px solid ${s.border}`,borderLeft:`3px solid ${s.leftBar}`,
                          background:s.bg,padding:"10px 12px",
                        }}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                            <span style={{fontSize:14,lineHeight:"18px",flexShrink:0}}>{ALERT_ICON[a.tipo]}</span>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:600,fontSize:12,color:s.titleColor,lineHeight:1.4}}>{a.mensagem}</div>
                              {a.detalhe && <div style={{fontSize:11,color:"#6B7280",marginTop:4}}>↳ {a.detalhe}</div>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{padding:"12px 16px",borderTop:"1px solid #F0F0F0",flex:"0 0 auto"}}>
                <button
                  onClick={()=>setAlertasModalOpen(false)}
                  style={{width:"100%",background:"#1A2E44",color:"#fff",border:"none",borderRadius:9,padding:"10px",cursor:"pointer",fontSize:13,fontWeight:700,letterSpacing:"0.02em",transition:"background 0.15s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#243d56")}
                  onMouseLeave={e=>(e.currentTarget.style.background="#1A2E44")}
                >
                  Fechar
                </button>
              </div>
            </div>
          </>
        )
      })()}

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes slideLeftIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}

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
