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
  { key:"TAC2",      label:"TAC 2",              bg:"#FFFFFF" },
  { key:"TAC1",      label:"TAC 1",              bg:"#FFFFFF" },
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

  function getAuxBlockReason(
    auxId: string,
    posto: PostoKey,
    turnoLetra: TurnoLetra,
    data: string
  ): string | null {
    const cfg = loadCfg()
    // Regra 1: Aux com turno N no mesmo dia não pode fazer turno M (só se bloquearTurnosConsecutivos)
    if (turnoLetra === "M" && cfg.bloquearTurnosConsecutivos) {
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
    // 2. Aux explicitly assigned to a DIFFERENT posto for this day+turno
    //    → exclude from derivation here (prevents "bleed" from multi-posto turnos)
    const busyAuxIds = new Set(
      escalas
        .filter(e => e.data===data && e.turno_letra===turnoLetra && e.auxiliar_id && e.posto!==posto)
        .map(e => e.auxiliar_id!)
    )
    // 3. Mensal candidates that cover this posto, not blocked
    const candidates = mensalEntries.filter(me => {
      if (me.data!==data || !me.auxiliar_id || !me.turno_id) return false
      if (busyAuxIds.has(me.auxiliar_id)) return false
      const t = turnosData.find(t => t.id===me.turno_id)
      if (!t || !t.postos.includes(posto)) return false
      return turnoToLetra(t) === turnoLetra
    })
    if (!candidates.length) return undefined
    // 4. Single candidate → return directly
    if (candidates.length === 1) {
      const me = candidates[0]
      return { id:`mensal_${me.id}`, data, posto, turno_letra:turnoLetra, auxiliar_id:me.auxiliar_id, doutor_id:null }
    }
    // 5. Multiple candidates (e.g. 2×N5) → distribute by posto index among
    //    aux-type postos with this turnoLetra, ordered by the POSTOS array
    const auxLetraPostos = POSTOS
      .filter(p =>
        POSTO_SCHEDULE[p.key]?.shifts.includes(turnoLetra as TurnoLetra) &&
        getPostoTipo(p.key as PostoKey, turnoLetra as TurnoLetra) === "auxiliar"
      )
      .map(p => p.key)
    const postoIdx = auxLetraPostos.indexOf(posto as PostoKey)
    const idx = postoIdx >= 0 && postoIdx < candidates.length ? postoIdx : 0
    const me = candidates[idx]
    return { id:`mensal_${me.id}`, data, posto, turno_letra:turnoLetra, auxiliar_id:me.auxiliar_id, doutor_id:null }
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
    const busyAuxIds = new Set(
      escalas
        .filter(e => e.data===data && e.turno_letra===turnoLetra && e.auxiliar_id && e.posto!==posto)
        .map(e => e.auxiliar_id!)
    )
    const mensalResults = mensalEntries.filter(me => {
      if (me.data !== data || !me.auxiliar_id || !me.turno_id) return false
      if (busyAuxIds.has(me.auxiliar_id)) return false
      const t = turnosData.find(t => t.id === me.turno_id)
      if (!t || !t.postos.includes(posto)) return false
      return turnoToLetra(t) === turnoLetra
    })
    return mensalResults.map(me => ({
      id: `mensal_${me.id}`, data, posto, turno_letra: turnoLetra,
      auxiliar_id: me.auxiliar_id, doutor_id: null
    }))
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

  // Builds the inner HTML content for PDF export (all styles inline)
  function buildPDFContent(): string {
    const wt = `Escala semana ${format(weekDays[0],"d",{locale:ptBR})} a ${format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}`

    // Shift row backgrounds
    const SHIFT_PDF: Record<TurnoLetra, string> = { N:"#D4E8F5", M:"#D9F2DD", T:"#FFF2C0" }
    // Per-posto cell background (inactive = grey)
    const POSTO_PDF: Record<PostoKey, string> = {
      RX_URG:"#FFFFFF", TAC2:"#FFFFFF", TAC1:"#FFFFFF",
      EXAM1:"#EDE3D8", EXAM2:"#EDE3D8",
      SALA6:"#D6EDBE", SALA7:"#D6EDBE",
      TRANSPORT:"#FFE4BF",
    }
    // Header group backgrounds
    const H1 = "#FFD700"   // main header row
    const H2 = "#FFEC6E"   // sub-header row

    // Column widths (px), total ≈ 1028px (fits 277mm A4 landscape at 3.78px/mm)
    const W: Record<string, string> = {
      day:"38px", turno:"22px",
      RX_URG:"100px", TAC2:"90px", TAC1:"90px",
      EXAM1:"110px", EXAM2:"130px",
      SALA6:"90px", SALA7:"90px",
      TRANSPORT:"110px",
    }

    let rows = ""
    for (const [di, day] of weekDays.entries()) {
      const ds = format(day, "yyyy-MM-dd")
      const dayBg = DAY_BG[di % DAY_BG.length]
      for (const [ti, turno] of TURNOS.entries()) {
        const shiftBg = SHIFT_PDF[turno as TurnoLetra]
        rows += "<tr>"
        if (ti === 0) {
          rows += `<td rowspan="3" style="${pdfTd(dayBg,"font-size:9pt;font-weight:900;vertical-align:middle;width:${W.day};")}">` +
            `<div style="font-size:11pt;font-weight:900;line-height:1.1">${format(day,"d")}</div>` +
            `<div style="font-size:7pt;font-weight:700;color:#555;margin-top:1px">${DIAS_PT[di]}</div>` +
            `</td>`
        }
        rows += `<td style="${pdfTd(shiftBg,"font-size:9pt;font-weight:900;width:${W.turno};")}"><b>${turno}</b></td>`
        for (const p of POSTOS) {
          const opera = postoOpera(p.key as PostoKey, turno, ds)
          const name = opera ? getCellDisplayName(ds, turno, p.key as PostoKey) : ""
          const bg = !opera ? "#E8E8E8" : POSTO_PDF[p.key as PostoKey]
          rows += `<td style="${pdfTd(bg,`width:${W[p.key]};${!opera?"color:#CCC;":""}`)}"><b>${name}</b></td>`
        }
        rows += "</tr>"
      }
    }

    return `
<div style="font-family:${PDF_FONT};background:white;padding:0;width:1028px;">
  <div style="text-align:center;margin-bottom:8px;padding-bottom:8px;border-bottom:3px solid #1A3A4A;">
    <div style="font-family:${PDF_FONT};font-size:14pt;font-weight:900;color:#1A3A4A;text-transform:uppercase;letter-spacing:0.5px">${wt}</div>
  </div>
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
        <th rowspan="2" style="${pdfTh("#D9D9D9","width:"+W.day+";")}">Dia</th>
        <th rowspan="2" style="${pdfTh("#D9D9D9","width:"+W.turno+";")}">T</th>
        <th style="${pdfTh(H1,"width:"+W.RX_URG+";")}">RX URG</th>
        <th style="${pdfTh(H1,"width:"+W.TAC2+";")}">TAC 2</th>
        <th style="${pdfTh(H1,"width:"+W.TAC1+";")}">TAC 1</th>
        <th colspan="2" style="${pdfTh(H1)}">Exames Complementares</th>
        <th colspan="2" style="${pdfTh("#92D050")}">RX</th>
        <th style="${pdfTh("#FFBE7B","width:"+W.TRANSPORT+";")}">Transportes INT/URG</th>
      </tr>
      <tr>
        <th style="${pdfTh(H2,"width:"+W.RX_URG+";")}"></th>
        <th style="${pdfTh(H2,"width:"+W.TAC2+";")}"></th>
        <th style="${pdfTh(H2,"width:"+W.TAC1+";")}"></th>
        <th style="${pdfTh(H2,"width:"+W.EXAM1+";font-size:7pt;")}">Eco Urg</th>
        <th style="${pdfTh(H2,"width:"+W.EXAM2+";font-size:7pt;")}">Eco Complementar</th>
        <th style="${pdfTh("#A8D890","width:"+W.SALA6+";font-size:7pt;")}">SALA 6 BB</th>
        <th style="${pdfTh("#A8D890","width:"+W.SALA7+";font-size:7pt;")}">SALA 7 EXT</th>
        <th style="${pdfTh("#FFCF99","width:"+W.TRANSPORT+";")}"></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`
  }

  // ── Generate Table HTML (for printEscala standalone window) ───────────────
  function generateTableHTML() {
    const wt = `Escala semana ${format(weekDays[0],"d",{locale:ptBR})} a ${format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}`
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${wt}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Calibri,Arial,sans-serif; background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  </style>
</head>
<body style="padding:10px">
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
    // Pass the HTML string directly — all styles are inline inside buildPDFContent()
    // so they survive html2pdf's internal innerHTML assignment without any style loss.
    // This avoids the "fixed element offscreen = blank canvas" problem.
    const opt: any = {
      margin: [6, 10, 6, 10],
      filename: `Escala_Semanal_${format(weekDays[0],"yyyy-MM-dd")}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 1048 },
      jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
      pagebreak: { mode: "avoid-all" },
    }
    html2pdf().set(opt).from(buildPDFContent()).save()
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
  const availableList = searchFiltered.filter(p => selCell ? !auxTemRestricao(p.id, selCell.posto, selCell.turnoLetra, selCell.data) : true)
  const restrictedList = searchFiltered.filter(p => selCell ? auxTemRestricao(p.id, selCell.posto, selCell.turnoLetra, selCell.data) : false)
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
                      return(
                        <td key={p.key}
                          onClick={opera ? ()=>openCell(dateStr,turno,p.key as PostoKey) : undefined}
                          title={!opera
                            ? "Posto não opera neste turno/dia"
                            : cellName
                              ? `${cellName}${derived?" (da escala mensal)":""}${temRestr?" ⚠️ restrição ativa":""}`
                              : isDocCell ? "Clique para atribuir Doutor" : "Clique para atribuir"}
                          style={{ ...cellBase,
                            backgroundColor: !opera ? "#E5E7EB" : p.bg,
                            opacity: !opera ? 0.5 : derived ? 0.75 : 1,
                            fontStyle: (derived || placeholder) ? "italic" : "normal",
                            color: placeholder ? "#9CA3AF" : "inherit",
                            cursor: !opera ? "not-allowed" : "pointer",
                            border: temRestr ? "2px solid #EF4444" : B }}
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
                    ? "Selecione até 2 auxiliares para Exames Comp. (1)"
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
                const isBlocked = !!blockReason
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
                    </div>
                    {pRestr && !isBlocked && <span title="Restrição ativa para este posto/turno" style={{ fontSize:"14px" }}>⚠️</span>}
                    {isBlocked && <span title={blockReason ?? ""} style={{ fontSize:"14px" }}>🔒</span>}
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
