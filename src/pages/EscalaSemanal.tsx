import { useEffect, useRef, useState } from "react"
import { format, startOfWeek, addDays, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Search, X, Check, FileDown, MessageCircle, Wand2, Loader2, Trash2, RotateCcw } from "lucide-react"
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface EscalaRow { id:string; data:string; posto:string; turno_letra:string; auxiliar_id:string|null; doutor_id:string|null }
interface UndoState { inserted:EscalaRow[]; deleted:EscalaRow[] }
interface Person { id:string; nome:string; trabalha_fds?: boolean }

// ─── Table styles ─────────────────────────────────────────────────────────────
const B = "1px solid #BBBBBB"
const thBase: React.CSSProperties = { border:B, padding:"4px 8px", textAlign:"center", fontWeight:700, fontSize:"11px", whiteSpace:"nowrap" }
const cellBase: React.CSSProperties = { border:B, padding:"2px 4px", textAlign:"center", cursor:"pointer", fontSize:"11px", fontWeight:600, minWidth:"88px", height:"26px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }

function getInitials(nome: string) {
  const p = nome.trim().split(/\s+/)
  return p.length===1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase()
}

// ─── Generating Modal ─────────────────────────────────────────────────────────
function GenModal({ log }: { log: string[] }) {
  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(6px)",animation:"fadeIn 0.2s ease" }} />
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:101,width:380,maxWidth:"90vw",background:"#fff",borderRadius:20,boxShadow:"0 32px 80px rgba(0,0,0,0.32)",animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden" }}>
        <div style={{ height:4,background:"linear-gradient(90deg,#1A3A4A,#4A90A4,#00BCD4)" }} />
        <div style={{ padding:"2rem",textAlign:"center" }}>
          <div style={{ width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#1A3A4A,#2A6A8A)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.25rem",boxShadow:"0 8px 24px rgba(26,58,74,0.4)",animation:"iconPulse 1.4s ease-in-out infinite" }}>
            <Wand2 size={28} color="white" />
          </div>
          <h3 style={{ fontSize:17,fontWeight:800,margin:"0 0 0.25rem",color:"#111" }}>A gerar a escala semanal…</h3>
          <p style={{ fontSize:13,color:"#6B7280",margin:0 }}>Respeitando restrições de turno e posto</p>
          {log.length > 0 ? (
            <div style={{ marginTop:"1.25rem",background:"#F8FAFC",borderRadius:10,padding:"0.75rem",textAlign:"left",border:"1px solid #E5E7EB",maxHeight:140,overflowY:"auto" }}>
              {log.map((e,i)=><div key={i} style={{ fontSize:11,color:i===log.length-1?"#1A3A4A":"#6B7280",fontWeight:i===log.length-1?600:400,padding:"1px 0",animation:i===log.length-1?"logSlide 0.2s ease":"none" }}>{e}</div>)}
            </div>
          ) : (
            <div style={{ marginTop:"1rem",display:"flex",justifyContent:"center",gap:5 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"#1A3A4A",opacity:0.3,animation:`dotBounce 1.2s ${i*0.2}s ease-in-out infinite` }}/>)}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes iconPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
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
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genLog,     setGenLog]     = useState<string[]>([])
  const [undoState,  setUndoState]  = useState<UndoState | null>(null)
  const [undoing,    setUndoing]    = useState(false)
  const [showClear,  setShowClear]  = useState(false)

  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [selCell,     setSelCell]     = useState<{ data:string; turnoLetra:TurnoLetra; posto:PostoKey; tipo:PostoTipo }|null>(null)
  const [selPersonId, setSelPersonId] = useState("")
  const [search,      setSearch]      = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const weekStart = startOfWeek(referenceDate, { weekStartsOn:1 })
  const weekDays  = Array.from({ length:7 }, (_,i) => addDays(weekStart, i))
  const startDate = format(weekDays[0],"yyyy-MM-dd")
  const endDate   = format(weekDays[6],"yyyy-MM-dd")

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)
    const [{ data:a },{ data:d },{ data:e }] = await Promise.all([
      supabase.from("auxiliares").select("id,nome,trabalha_fds").eq("disponivel",true).order("nome"),
      supabase.from("doutores").select("id,nome").order("nome"),
      supabase.from("escalas").select("id,data,posto,turno_letra,auxiliar_id,doutor_id")
        .gte("data",startDate).lte("data",endDate)
        .not("posto","is",null).not("turno_letra","is",null),
    ])
    setAuxiliares(a ?? [])
    setDoutores(d ?? [])
    setEscalas(e ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [startDate])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getEscala(data:string, turnoLetra:string, posto:string) {
    return escalas.find(e => e.data===data && e.turno_letra===turnoLetra && e.posto===posto)
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
    const payload = { data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, tipo_escala:"semanal", status:"alocado", auxiliar_id:selCell.tipo==="auxiliar"?selPersonId:null, doutor_id:selCell.tipo==="doutor"?selPersonId:null }
    let savedId: string|null = null
    if (ex) { const {error}=await supabase.from("escalas").update(payload).eq("id",ex.id); if(!error) savedId=ex.id }
    else { const {data:rows,error}=await supabase.from("escalas").insert(payload).select("id"); if(!error&&rows?.length) savedId=rows[0].id }
    setSaving(false); closeDialog()
    if (savedId) {
      const nr: EscalaRow = { id:savedId, data:selCell.data, posto:selCell.posto, turno_letra:selCell.turnoLetra, auxiliar_id:selCell.tipo==="auxiliar"?selPersonId:null, doutor_id:selCell.tipo==="doutor"?selPersonId:null }
      setEscalas(p => ex ? p.map(e=>e.id===ex.id?nr:e) : [...p,nr])
    } else fetchAll()
  }

  async function clearEscala() {
    if (!selCell) return
    const ex = getEscala(selCell.data, selCell.turnoLetra, selCell.posto)
    closeDialog()
    if (ex) { setEscalas(p=>p.filter(e=>e.id!==ex.id)); const {error}=await supabase.from("escalas").delete().eq("id",ex.id); if(error) fetchAll() }
  }

  // ── Gerar Escala Semanal ──────────────────────────────────────────────────
  async function gerarEscala() {
    if (auxiliares.length===0 && doutores.length===0) return
    const cfg = loadCfg()

    // Fetch restrictions + turno names + escala mensal + ausências desta semana
    const [{ data:restricoes }, { data:allTurnos }, { data:mensalSemana }, { data:ausenciasSemana }] = await Promise.all([
      supabase.from("restricoes").select("auxiliar_id,turno_id,posto"),
      supabase.from("turnos").select("id,nome"),
      supabase.from("escalas")
        .select("auxiliar_id,data,turno_id")
        .eq("tipo_escala","mensal")
        .gte("data", startDate).lte("data", endDate)
        .not("turno_id","is",null),
      supabase.from("ausencias")
        .select("auxiliar_id,data_inicio,data_fim")
        .lte("data_inicio", endDate).gte("data_fim", startDate),
    ])

    setGenerating(true)
    setGenLog([])

    try {

    // Build posto restrictions: auxId → Set<postoKey>
    const postoRestr: Record<string, Set<string>> = {}
    // Build turno letter restrictions: auxId → Set<letter>
    const turnoLetterRestr: Record<string, Set<string>> = {}

    for (const r of (restricoes ?? [])) {
      if (r.posto) {
        if (!postoRestr[r.auxiliar_id]) postoRestr[r.auxiliar_id] = new Set()
        postoRestr[r.auxiliar_id].add(r.posto)
      }
      if (r.turno_id && allTurnos) {
        const turno = allTurnos.find(t => t.id===r.turno_id)
        if (turno) {
          const n = turno.nome.toUpperCase()
          const letter = n.startsWith("MT") ? "MT" : n.startsWith("N") ? "N" : n.startsWith("M") ? "M" : n.startsWith("T") ? "T" : ""
          if (letter) {
            if (!turnoLetterRestr[r.auxiliar_id]) turnoLetterRestr[r.auxiliar_id] = new Set()
            turnoLetterRestr[r.auxiliar_id].add(letter)
            if (letter==="MT") turnoLetterRestr[r.auxiliar_id].add("M")
          }
        }
      }
    }

    // ── Turno mensal por aux por dia: auxId → dateStr → TurnoLetra ──────────
    // Se o aux estiver de Tarde na mensal naquele dia → só aparece em slots T
    function turnoIdToLetra(turnoId: string): TurnoLetra | null {
      const t = allTurnos?.find(t => t.id===turnoId)
      if (!t) return null
      const n = t.nome.toUpperCase()
      if (n.startsWith("N")) return "N"
      if (n.startsWith("M") && !n.startsWith("MT")) return "M"
      if (n.startsWith("T")) return "T"
      return null
    }
    const auxDayShift: Record<string, Record<string, TurnoLetra>> = {}
    for (const e of (mensalSemana ?? [])) {
      if (!e.auxiliar_id || !e.turno_id || !e.data) continue
      const letra = turnoIdToLetra(e.turno_id)
      if (!letra) continue
      if (!auxDayShift[e.auxiliar_id]) auxDayShift[e.auxiliar_id] = {}
      auxDayShift[e.auxiliar_id][e.data] = letra
    }

    // Fallback shift assignment (para aux sem mensal nesta semana)
    const auxShift: Record<string, TurnoLetra> = {}
    for (const e of escalas) {
      if (e.auxiliar_id && e.turno_letra && !auxShift[e.auxiliar_id])
        auxShift[e.auxiliar_id] = e.turno_letra as TurnoLetra
    }
    const shiftTotals: Record<TurnoLetra, number> = { N:0, M:0, T:0 }
    for (const s of Object.values(auxShift)) shiftTotals[s] = (shiftTotals[s]||0)+1
    for (const aux of auxiliares) {
      if (auxShift[aux.id]) continue
      const lr = turnoLetterRestr[aux.id] ?? new Set()
      const available = (["N","M","T"] as TurnoLetra[]).filter(l => !lr.has(l))
      if (available.length === 0) continue
      const picked = available.sort((a,b) => (shiftTotals[a]||0)-(shiftTotals[b]||0))[0]
      auxShift[aux.id] = picked
      shiftTotals[picked] = (shiftTotals[picked]||0)+1
    }

    // Build ausências blocked set: `${auxId}_${dateStr}`
    const ausBlock = new Set<string>()
    for (const aus of (ausenciasSemana ?? [])) {
      try {
        let cur = parseISO(aus.data_inicio)
        const fim = parseISO(aus.data_fim)
        while (cur <= fim) {
          ausBlock.add(`${aus.auxiliar_id}_${format(cur,"yyyy-MM-dd")}`)
          cur = addDays(cur, 1)
        }
      } catch { /* skip malformed date */ }
    }

    // Count existing assignments this week
    const auxCount: Record<string,number> = Object.fromEntries(auxiliares.map(a=>[a.id,0]))
    const dotCount: Record<string,number> = Object.fromEntries(doutores.map(d=>[d.id,0]))
    escalas.forEach(e => {
      if (e.auxiliar_id) auxCount[e.auxiliar_id] = (auxCount[e.auxiliar_id]??0)+1
      if (e.doutor_id)   dotCount[e.doutor_id]   = (dotCount[e.doutor_id]  ??0)+1
    })

    const payloads: object[] = []

    for (const day of weekDays) {
      const dateStr = format(day,"yyyy-MM-dd")
      const dow = day.getDay() // 0=Dom, 6=Sáb
      const isFds = dow === 0 || dow === 6

      for (const turno of TURNOS) {
        for (const posto of POSTOS) {
          if (getEscala(dateStr, turno, posto.key)) continue // already filled
          const tipo = getPostoTipo(posto.key as PostoKey, turno)

          if (tipo === "doutor") {
            if (!doutores.length) continue
            const avail = doutores.filter(d => (dotCount[d.id]??0) < cfg.maxTurnosSemana)
            if (!avail.length) continue
            const picked = avail.sort((a,b)=>(dotCount[a.id]??0)-(dotCount[b.id]??0))[0]
            dotCount[picked.id] = (dotCount[picked.id]??0)+1
            payloads.push({ data:dateStr, posto:posto.key, turno_letra:turno, tipo_escala:"semanal", status:"alocado", auxiliar_id:null, doutor_id:picked.id })

          } else {
            if (!auxiliares.length) continue

            // Turno esperado por aux: prioriza escala mensal deste dia, depois fallback semanal
            // Respeita: ausências, FDS, restrições de turno/posto, limite semanal
            const avail = auxiliares.filter(aux => {
              if (isFds && aux.trabalha_fds === false) return false          // não trabalha FDS
              if (ausBlock.has(`${aux.id}_${dateStr}`)) return false         // ausência
              const mensalLetra = auxDayShift[aux.id]?.[dateStr]
              const expectedShift = mensalLetra ?? auxShift[aux.id]
              if (expectedShift && expectedShift !== turno) return false      // turno errado
              if (postoRestr[aux.id]?.has(posto.key)) return false           // posto restrito
              if ((auxCount[aux.id]??0) >= cfg.maxTurnosSemana) return false // limite semanal
              return true
            })

            let picked = avail.length > 0
              ? avail.sort((a,b)=>(auxCount[a.id]??0)-(auxCount[b.id]??0))[0]
              : null

            // Fallback: ignora turno fixo mas mantém restrições obrigatórias
            if (!picked) {
              const fallback = auxiliares.filter(aux => {
                if (isFds && aux.trabalha_fds === false) return false
                if (ausBlock.has(`${aux.id}_${dateStr}`)) return false
                if (postoRestr[aux.id]?.has(posto.key)) return false
                const lr = turnoLetterRestr[aux.id] ?? new Set()
                if (lr.has(turno)) return false
                if ((auxCount[aux.id]??0) >= cfg.maxTurnosSemana) return false
                return true
              })
              if (!fallback.length) continue
              picked = fallback.sort((a,b)=>(auxCount[a.id]??0)-(auxCount[b.id]??0))[0]
            }

            auxCount[picked.id] = (auxCount[picked.id]??0)+1
            setGenLog(p => [...p, `✓ ${picked!.nome.split(" ")[0]} · ${posto.label} · ${turno}`].slice(-8))
            payloads.push({ data:dateStr, posto:posto.key, turno_letra:turno, tipo_escala:"semanal", status:"alocado", auxiliar_id:picked.id, doutor_id:null })
          }
        }
      }
      // small delay per day for animation visibility
      await new Promise(r => setTimeout(r, 60))
    }

    if (payloads.length > 0) {
      const { data:rows, error } = await supabase.from("escalas").insert(payloads).select("id,data,posto,turno_letra,auxiliar_id,doutor_id")
      if (!error && rows) {
        setEscalas(p => [...p, ...(rows as EscalaRow[])])
        setUndoState({ inserted: rows as EscalaRow[], deleted:[] })
      }
    }

    } catch (err) {
      console.error("Erro ao gerar escala semanal:", err)
    } finally {
      setGenerating(false)
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

  // ── Export PDF ────────────────────────────────────────────────────────────
  function exportPDF() {
    const wt = `Escala semana ${format(weekDays[0],"d",{locale:ptBR})} a ${format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR})}`
    const thS=(txt:string,bg:string,ex="")=>`<th style="border:1px solid #999;padding:4px 6px;background:${bg};font-size:10px;font-weight:700;text-align:center;white-space:nowrap;${ex}">${txt}</th>`
    const tdS=(txt:string,bg:string,ex="")=>`<td style="border:1px solid #999;padding:3px 5px;background:${bg};font-size:10px;text-align:center;font-weight:${txt?"700":"400"};${ex}">${txt}</td>`
    let rows=""
    for(const [di,day] of weekDays.entries()){
      const ds=format(day,"yyyy-MM-dd")
      for(const [ti,turno] of TURNOS.entries()){
        rows+="<tr>"
        if(ti===0) rows+=`<td rowspan="3" style="border:1px solid #999;padding:4px;background:${DAY_BG[di%DAY_BG.length]};text-align:center;font-weight:700;font-size:11px;vertical-align:middle;">${format(day,"d")}<br/>${DIAS_PT[di]}</td>`
        rows+=tdS(turno,SHIFT_BG[turno as TurnoLetra],"font-weight:700;min-width:22px;")
        for(const p of POSTOS) rows+=tdS(getCellName(getEscala(ds,turno,p.key)),p.bg,"min-width:80px;")
        rows+="</tr>"
      }
    }
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${wt}</title><style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}@media print{body{margin:8mm}}</style></head><body><h2 style="font-size:13px;margin-bottom:10px">${wt}</h2><table><thead><tr>${thS("","#D9D9D9","min-width:40px;")}${thS("","#D9D9D9","min-width:24px;")}${thS("RX URG","#FFD700")}${thS("TAC 1","#FFD700")}${thS("TAC 2","#FFD700")}<th colspan="2" style="border:1px solid #999;padding:4px 6px;background:#FFD700;font-size:10px;font-weight:700;text-align:center;">Exames Complementares</th><th colspan="2" style="border:1px solid #999;padding:4px 6px;background:#FFD700;font-size:10px;font-weight:700;text-align:center;">RX</th>${thS("Transportes INT/URG","#FFD700")}</tr><tr>${thS("","#D9D9D9")}${thS("","#D9D9D9")}${["","","","",""].map(()=>thS("","#FFD700")).join("")}${thS("SALA 6 BB","#FFD700")}${thS("SALA 7 EXT","#FFD700")}${thS("","#FFD700")}</tr></thead><tbody>${rows}</tbody></table></body></html>`
    const w=window.open("","_blank","width=1100,height=700"); if(!w) return
    w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400)
  }

  function shareWA() {
    const hdr=`📅 *ESCALA ${format(weekDays[0],"d",{locale:ptBR}).toUpperCase()} A ${format(weekDays[6],"d 'de' MMMM yyyy",{locale:ptBR}).toUpperCase()}*`
    const lines=[hdr,""]
    for(const [di,day] of weekDays.entries()){
      const ds=format(day,"yyyy-MM-dd")
      lines.push(`*${DIAS_PT[di]} ${format(day,"d/M")}*`)
      for(const t of TURNOS){ const cells=POSTOS.map(p=>getCellName(getEscala(ds,t,p.key))||"—").join(" | "); lines.push(`  _${t}:_ ${cells}`) }
      lines.push("")
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank")
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const personList: Person[] = selCell?.tipo==="doutor" ? doutores : auxiliares
  const filtered = personList.filter(p=>p.nome.toLowerCase().includes(search.toLowerCase()))
  const posto      = selCell ? postoInfo(selCell.posto) : null
  const accentBg   = posto?.bg==="#FFFFFF" ? "#4A90A4" : (posto?.bg ?? "#4A90A4")
  const dayIdx     = selCell ? weekDays.findIndex(d=>format(d,"yyyy-MM-dd")===selCell.data) : -1
  const dayLabel   = dayIdx>=0 ? `${format(weekDays[dayIdx],"d")} ${DIAS_PT[dayIdx]}` : ""
  const hasExisting= !!(selCell && getEscala(selCell.data,selCell.turnoLetra,selCell.posto))

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

          {/* Gerar */}
          <Button onClick={gerarEscala} disabled={generating||loading} size="sm" className="gap-2"
            style={{ background:"linear-gradient(135deg,#1A3A4A,#2A6A8A)",color:"white",boxShadow:generating?"none":"0 2px 10px rgba(26,58,74,0.4)" }}>
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
          <Button onClick={exportPDF} disabled={loading} variant="outline" size="sm" className="gap-2"><FileDown className="h-4 w-4"/> PDF</Button>
          <Button onClick={shareWA} disabled={loading} variant="outline" size="sm" className="gap-2 border-green-400 text-green-700 hover:bg-green-50"><MessageCircle className="h-4 w-4"/> WhatsApp</Button>
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="text-center text-gray-400 py-16 text-sm">A carregar...</div> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table style={{ borderCollapse:"collapse",width:"100%" }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ ...thBase,backgroundColor:"#D9D9D9",minWidth:"70px" }}/>
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}>RX URG</th>
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}>TAC 1</th>
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}>TAC 2</th>
                <th colSpan={2} style={{ ...thBase,backgroundColor:"#FFD700" }}>Exames Complementares</th>
                <th colSpan={2} style={{ ...thBase,backgroundColor:"#FFD700" }}>RX</th>
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}>Transportes<br/>INT/URG</th>
              </tr>
              <tr>
                <th colSpan={2} style={{ ...thBase,backgroundColor:"#D9D9D9" }}/>
                {(["RX_URG","TAC1","TAC2","EXAM1","EXAM2"] as PostoKey[]).map(k=><th key={k} style={{ ...thBase,backgroundColor:"#FFD700" }}/>)}
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}>SALA 6 BB</th>
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}>SALA 7 EXT</th>
                <th style={{ ...thBase,backgroundColor:"#FFD700" }}/>
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
                      const esc=getEscala(dateStr,turno,p.key)
                      return(
                        <td key={p.key} onClick={()=>openCell(dateStr,turno,p.key as PostoKey)} title={getCellName(esc)||"Clique para atribuir"}
                          style={{ ...cellBase,backgroundColor:p.bg }}
                          onMouseEnter={e=>(e.currentTarget.style.filter="brightness(0.91)")}
                          onMouseLeave={e=>(e.currentTarget.style.filter="brightness(1)")}>
                          {getCellName(esc)}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {generating && <GenModal log={genLog}/>}
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
                return(
                  <button key={p.id} onClick={()=>setSelPersonId(isSel?"":p.id)}
                    style={{ width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"9px 12px",borderRadius:"10px",border:"none",cursor:"pointer",textAlign:"left",backgroundColor:isSel?"#EBF4F8":"transparent",transition:"background-color 0.12s" }}
                    onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.backgroundColor="#F7F8FA" }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.backgroundColor="transparent" }}>
                    <div style={{ width:"36px",height:"36px",borderRadius:"10px",backgroundColor:isSel?accentBg:"#E8EEF2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,flexShrink:0,color:isSel?"#FFFFFF":"#5A7080",transition:"all 0.12s" }}>{getInitials(p.nome)}</div>
                    <span style={{ flex:1,fontSize:"13px",fontWeight:isSel?600:500,color:isSel?"#1A3A4A":"#333" }}>{p.nome}</span>
                    {isSel && <div style={{ width:"22px",height:"22px",borderRadius:"50%",backgroundColor:accentBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Check size={13} color="#FFF" strokeWidth={2.5}/></div>}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ padding:"14px 20px 20px",borderTop:"1px solid #F0F0F0",display:"flex",gap:"8px",justifyContent:"flex-end",alignItems:"center" }}>
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
      `}</style>
    </>
  )
}
