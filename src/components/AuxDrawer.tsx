import React, { useEffect, useState, useMemo } from "react"
import { getDaysInMonth, differenceInDays, parseISO, addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { X, ChevronLeft, ChevronRight, CalendarDays, Moon, Trash2, User, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Ausencia } from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

export const SPECIAL = [
  { code: "D",   label: "Descanso",            bg: "#D1D5DB", text: "#374151" },
  { code: "F",   label: "Folga",               bg: "#F3F4F6", text: "#6B7280" },
  { code: "Fe",  label: "Comp. Feriado",       bg: "#86EFAC", text: "#14532D" },
  { code: "FAA", label: "Férias Ano Anterior", bg: "#FCA5A5", text: "#7F1D1D" },
  { code: "L",   label: "Licença",             bg: "#DDD6FE", text: "#4C1D95" },
  { code: "Aci", label: "Acidente Trabalho",   bg: "#A5F3FC", text: "#164E63" },
] as const

const DIAS_CAL   = ["S","T","Q","Q","S","S","D"]
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const PAGE_SIZE  = 10

// ─── Range Calendar ───────────────────────────────────────────────────────────

function RangeCal({ startDate, endDate, onChange }: {
  startDate: string; endDate: string
  onChange: (s: string, e: string) => void
}) {
  const today = new Date()
  const [vy, setVy] = useState(today.getFullYear())
  const [vm, setVm] = useState(today.getMonth())
  const [phase, setPhase] = useState<"start"|"end">("start")
  const [hover, setHover] = useState("")

  function prevMonth() { if (vm===0){setVy(y=>y-1);setVm(11)}else setVm(m=>m-1) }
  function nextMonth() { if (vm===11){setVy(y=>y+1);setVm(0)}else setVm(m=>m+1) }

  function ds(d: number) {
    return `${vy}-${String(vm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
  }
  function handleClick(d: number) {
    const s = ds(d)
    if (phase === "start" || !startDate) { onChange(s, ""); setPhase("end") }
    else { if (s >= startDate) { onChange(startDate, s); setPhase("start") } else { onChange(s, ""); setPhase("end") } }
  }

  const dim      = getDaysInMonth(new Date(vy, vm))
  const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7
  const today0   = format(today, "yyyy-MM-dd")
  const effectiveEnd = phase==="end" && hover && startDate && hover > startDate ? hover : endDate

  return (
    <div style={{ background:"#F9FAFB", borderRadius:12, padding:"12px", border:"1px solid #E5E7EB" }}>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {(["start","end"] as const).map(p => (
          <div key={p} style={{ flex:1, padding:"4px 8px", borderRadius:8, fontSize:11, fontWeight:600, border:phase===p?"1.5px solid #4F46E5":"1.5px solid #E5E7EB", background:phase===p?"#EEF2FF":"#fff", color:phase===p?"#4F46E5":"#6B7280", textAlign:"center", cursor:"pointer" }} onClick={() => setPhase(p)}>
            {p==="start"?"Início":"Fim"}: {p==="start"?(startDate?startDate.split("-").reverse().join("/"):"—"):(endDate?endDate.split("-").reverse().join("/"):"—")}
          </div>
        ))}
        {(startDate||endDate) && (
          <button onClick={()=>{onChange("","");setPhase("start")}} style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF" }}><X size={14}/></button>
        )}
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
        <button onClick={prevMonth} style={{ border:"none",background:"none",cursor:"pointer",padding:4,borderRadius:6,color:"#374151" }}><ChevronLeft size={15}/></button>
        <span style={{ fontWeight:700,fontSize:13,color:"#111" }}>{MESES_FULL[vm]} {vy}</span>
        <button onClick={nextMonth} style={{ border:"none",background:"none",cursor:"pointer",padding:4,borderRadius:6,color:"#374151" }}><ChevronRight size={15}/></button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3 }}>
        {DIAS_CAL.map((d,i) => <div key={i} style={{ textAlign:"center",fontSize:10,color:"#9CA3AF",fontWeight:700,padding:"1px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
        {Array(firstDow).fill(null).map((_,i) => <div key={`e${i}`}/>)}
        {Array(dim).fill(null).map((_,i) => {
          const day = i+1; const date = ds(day)
          const isSt = date===startDate; const isEn = date===endDate
          const inRg = !!(startDate && effectiveEnd && date>startDate && date<effectiveEnd)
          const isTo = date===today0
          return (
            <button key={day} onClick={() => handleClick(day)}
              onMouseEnter={() => phase==="end" && startDate ? setHover(date) : undefined}
              onMouseLeave={() => setHover("")}
              style={{ border:isTo&&!isSt&&!isEn?"1.5px solid #C7D2FE":"none", borderRadius:isSt||isEn?7:inRg?2:7, background:isSt||isEn?"#4F46E5":inRg?"#EEF2FF":"transparent", color:isSt||isEn?"#fff":inRg?"#3730A3":isTo?"#4F46E5":"#374151", cursor:"pointer", padding:"5px 2px", fontSize:12, fontWeight:isSt||isEn?700:400, textAlign:"center", transition:"background 0.1s" }}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── AuxDrawer ────────────────────────────────────────────────────────────────

export function AuxDrawer({ aux, onClose, onUpdated, onAusenciaSaved }: {
  aux: Auxiliar; onClose: () => void; onUpdated: (a: Auxiliar) => void
  onAusenciaSaved?: () => void
}) {
  const [step, setStep]             = useState<1|2>(1)
  const [ausencias, setAusencias]   = useState<Ausencia[]>([])
  const [ausLoading, setAusLoading] = useState(true)
  const [selCode, setSelCode]       = useState<string | null>(null)
  const [dateStart, setDateStart]   = useState("")
  const [dateEnd,   setDateEnd]     = useState("")
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [fdsToggling, setFdsToggling] = useState(false)
  // Step 2
  const [filterCode, setFilterCode] = useState<string | null>(null)
  const [page, setPage]             = useState(0)

  async function fetchAus() {
    setAusLoading(true)
    const { data, error } = await supabase
      .from("ausencias").select("*")
      .eq("auxiliar_id", aux.id)
      .order("data_inicio", { ascending: false })
    if (error) console.error("Erro ao buscar ausencias:", error)
    setAusencias(data ?? [])
    setAusLoading(false)
  }
  useEffect(() => { fetchAus() }, [aux.id])

  async function saveAusencia() {
    if (!selCode || !dateStart || !dateEnd) return
    setSaving(true)

    const { error: ausErr } = await supabase.from("ausencias").insert({
      auxiliar_id: aux.id, codigo: selCode,
      data_inicio: dateStart, data_fim: dateEnd,
    })
    if (ausErr) console.error("Erro ausencias:", ausErr)

    await supabase.from("escalas")
      .delete()
      .eq("auxiliar_id", aux.id).eq("tipo_escala","mensal")
      .gte("data", dateStart).lte("data", dateEnd)

    const rows: object[] = []
    let cur = parseISO(dateStart)
    const fim = parseISO(dateEnd)
    while (cur <= fim) {
      rows.push({ auxiliar_id:aux.id, data:format(cur,"yyyy-MM-dd"), tipo_escala:"mensal", status:"alocado", turno_id:null, codigo_especial:selCode })
      cur = addDays(cur, 1)
    }
    if (rows.length) {
      const { error: escErr } = await supabase.from("escalas").insert(rows)
      if (escErr) console.error("Erro escalas:", escErr)
    }

    setSelCode(null); setDateStart(""); setDateEnd("")
    await fetchAus()
    setSaving(false)
    onAusenciaSaved?.()
  }

  async function deleteAusencia(aus: Ausencia) {
    setDeleting(aus.id)
    await supabase.from("ausencias").delete().eq("id", aus.id)
    await supabase.from("escalas")
      .delete()
      .eq("auxiliar_id", aus.auxiliar_id).eq("tipo_escala","mensal")
      .gte("data", aus.data_inicio).lte("data", aus.data_fim)
      .eq("codigo_especial", aus.codigo)
    await fetchAus()
    setDeleting(null)
    onAusenciaSaved?.()
  }

  async function toggleFds() {
    setFdsToggling(true)
    const nv = !aux.trabalha_fds
    await supabase.from("auxiliares").update({ trabalha_fds: nv }).eq("id", aux.id)
    onUpdated({ ...aux, trabalha_fds: nv })
    setFdsToggling(false)
  }

  const canSave = !!selCode && !!dateStart && !!dateEnd
  const durDays = dateStart && dateEnd ? differenceInDays(parseISO(dateEnd), parseISO(dateStart)) + 1 : 0
  function fmtDate(d: string) { return d ? format(parseISO(d),"d MMM yyyy",{locale:ptBR}) : "—" }

  // Step 2 — filtered + paginated
  const filtered = useMemo(() =>
    filterCode ? ausencias.filter(a => a.codigo === filterCode) : ausencias
  , [ausencias, filterCode])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  // Stats: total days per code
  const stats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of ausencias) {
      const d = differenceInDays(parseISO(a.data_fim), parseISO(a.data_inicio)) + 1
      map[a.codigo] = (map[a.codigo] ?? 0) + d
    }
    return map
  }, [ausencias])

  const totalAusenciaDays = Object.entries(stats).filter(([c]) => ["Fe","FAA","L","Aci"].includes(c)).reduce((s,[,v])=>s+v,0)
  const nextAus = ausencias.filter(a => parseISO(a.data_fim) >= new Date()).sort((a,b)=>a.data_inicio.localeCompare(b.data_inicio))[0]

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 40,
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(2px)",
  }

  const drawerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    right: 0,
    width: 480,
    maxWidth: "100vw",
    height: "100vh",
    background: "#fff",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
    animation: "auxSlideIn 0.28s cubic-bezier(0.34,1.2,0.64,1)",
  }

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={drawerStyle}>

        {/* ── Header ── */}
        <div style={{ background:"linear-gradient(135deg,#1E3A5F,#2563EB)",padding:"18px 20px 0",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:46,height:46,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,color:"#fff",flexShrink:0 }}>
                {aux.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:800,fontSize:15,color:"#fff" }}>{aux.nome}</div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,0.65)",marginTop:2 }}>{aux.email ?? "Sem email"}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,cursor:"pointer",padding:6,color:"#fff",display:"flex",flexShrink:0 }}><X size={17}/></button>
          </div>

          {/* Step tabs */}
          <div style={{ display:"flex",gap:2 }}>
            {([
              { s:1 as const, icon:<CalendarDays size={13}/>, label:"Ausências" },
              { s:2 as const, icon:<User size={13}/>,          label:"Perfil" },
            ]).map(({ s, icon, label }) => (
              <button key={s} onClick={() => setStep(s)}
                style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"9px 12px",border:"none",cursor:"pointer",fontSize:12,fontWeight:step===s?700:500,color:step===s?"#2563EB":"rgba(255,255,255,0.7)",background:step===s?"#fff":"transparent",borderRadius:"8px 8px 0 0",transition:"all 0.15s" }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14 }}>

          {/* ════ STEP 1 ════ */}
          {step === 1 && <>

            {/* FDS toggle */}
            <div style={{ background:"#F8FAFC",borderRadius:12,padding:"13px 15px",border:"1px solid #E5E7EB" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:34,height:34,borderRadius:9,background:aux.trabalha_fds?"#DBEAFE":"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Moon size={16} color={aux.trabalha_fds?"#2563EB":"#9CA3AF"}/>
                  </div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>Trabalha fins de semana</div>
                    <div style={{ fontSize:11,color:"#6B7280",marginTop:1 }}>{aux.trabalha_fds?"Sáb/Dom incluídos na escala":"Sáb/Dom excluídos ao gerar escala"}</div>
                  </div>
                </div>
                <button onClick={toggleFds} disabled={fdsToggling} style={{ width:44,height:25,borderRadius:99,border:"none",cursor:"pointer",background:aux.trabalha_fds?"#2563EB":"#D1D5DB",position:"relative",transition:"background 0.2s",flexShrink:0 }}>
                  <span style={{ position:"absolute",top:2.5,left:aux.trabalha_fds?21:2.5,width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"left 0.2s" }}/>
                </button>
              </div>
            </div>

            {/* Add absence */}
            <div style={{ background:"#F8FAFC",borderRadius:12,padding:"14px 15px",border:"1px solid #E5E7EB" }}>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:12 }}>
                <CalendarDays size={15} color="#4F46E5"/>
                <span style={{ fontSize:13,fontWeight:700,color:"#111" }}>Adicionar Ausência / Contrato</span>
              </div>

              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,color:"#6B7280",fontWeight:600,marginBottom:7 }}>Tipo</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {SPECIAL.map(sp => (
                    <button key={sp.code} onClick={() => setSelCode(selCode===sp.code?null:sp.code)}
                      style={{ padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,border:selCode===sp.code?`2px solid ${sp.text}`:"2px solid transparent",background:selCode===sp.code?sp.bg:"#fff",color:selCode===sp.code?sp.text:"#374151",boxShadow:selCode===sp.code?"0 0 0 2px rgba(0,0,0,0.08)":"0 1px 3px rgba(0,0,0,0.08)",outline:"none",transition:"all 0.15s" }}>
                      <span style={{ fontWeight:800 }}>{sp.code}</span>
                      <span style={{ fontWeight:400,marginLeft:5,fontSize:10,color:selCode===sp.code?sp.text:"#9CA3AF" }}>{sp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,color:"#6B7280",fontWeight:600,marginBottom:6 }}>
                  Período {durDays>0 && <span style={{ color:"#4F46E5",fontWeight:700 }}>({durDays} {durDays===1?"dia":"dias"})</span>}
                </div>
                <RangeCal startDate={dateStart} endDate={dateEnd} onChange={(s,e)=>{setDateStart(s);setDateEnd(e)}}/>
              </div>

              <button onClick={saveAusencia} disabled={!canSave||saving}
                style={{ width:"100%",padding:"9px",borderRadius:9,border:"none",cursor:canSave&&!saving?"pointer":"not-allowed",background:canSave&&!saving?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#E5E7EB",color:canSave&&!saving?"#fff":"#9CA3AF",fontWeight:700,fontSize:13,transition:"all 0.2s" }}>
                {saving ? "A guardar…" : "Guardar Ausência"}
              </button>
            </div>

            {/* Quick preview — last 3 */}
            {!ausLoading && ausencias.length > 0 && (
              <div style={{ background:"#F8FAFC",borderRadius:12,padding:"13px 15px",border:"1px solid #E5E7EB" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>Últimas ausências</div>
                  <button onClick={() => setStep(2)} style={{ fontSize:11,color:"#4F46E5",fontWeight:600,border:"none",background:"none",cursor:"pointer" }}>Ver todas →</button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                  {ausencias.slice(0,3).map(a => {
                    const sp = SPECIAL.find(s=>s.code===a.codigo)
                    const d  = differenceInDays(parseISO(a.data_fim), parseISO(a.data_inicio)) + 1
                    return (
                      <div key={a.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:8,padding:"8px 11px",border:"1px solid #E5E7EB" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                          <span style={{ padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:800,background:sp?.bg??"#F3F4F6",color:sp?.text??"#374151" }}>{a.codigo}</span>
                          <div>
                            <div style={{ fontSize:11,fontWeight:600,color:"#111" }}>{fmtDate(a.data_inicio)} → {fmtDate(a.data_fim)}</div>
                            <div style={{ fontSize:10,color:"#6B7280" }}>{d} {d===1?"dia":"dias"}</div>
                          </div>
                        </div>
                        <button onClick={() => deleteAusencia(a)} disabled={deleting===a.id} style={{ border:"none",background:"none",cursor:"pointer",color:"#EF4444",padding:3,borderRadius:5,display:"flex" }}>
                          {deleting===a.id ? <span style={{ fontSize:10 }}>…</span> : <Trash2 size={13}/>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>}

          {/* ════ STEP 2 ════ */}
          {step === 2 && <>

            {/* Info cards */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {[
                { label:"Nº Mecanográfico", value: aux.numero_mecanografico ?? "—" },
                { label:"NIF",              value: aux.contribuinte ?? "—" },
                { label:"Estado",           value: aux.disponivel?"Disponível":"Indisponível", badge:aux.disponivel?"#D1FAE5":"#FEE2E2", badgeText:aux.disponivel?"#065F46":"#991B1B" },
                { label:"Fins de semana",   value: aux.trabalha_fds?"Trabalha":"Não trabalha", badge:aux.trabalha_fds?"#DBEAFE":"#F3F4F6", badgeText:aux.trabalha_fds?"#1D4ED8":"#6B7280" },
              ].map(item => (
                <div key={item.label} style={{ background:"#F8FAFC",borderRadius:10,padding:"10px 12px",border:"1px solid #E5E7EB" }}>
                  <div style={{ fontSize:10,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{item.label}</div>
                  {item.badge
                    ? <span style={{ display:"inline-block",background:item.badge,color:item.badgeText,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{item.value}</span>
                    : <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{item.value}</div>}
                </div>
              ))}
            </div>

            {/* Stats summary */}
            {Object.keys(stats).length > 0 && (
              <div style={{ background:"#F8FAFC",borderRadius:12,padding:"13px 15px",border:"1px solid #E5E7EB" }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#374151",marginBottom:10 }}>Resumo de ausências</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:10 }}>
                  {SPECIAL.filter(sp => stats[sp.code]).map(sp => (
                    <div key={sp.code} style={{ display:"flex",alignItems:"center",gap:6,background:"#fff",border:"1px solid #E5E7EB",borderRadius:8,padding:"6px 10px" }}>
                      <span style={{ padding:"1px 7px",borderRadius:99,fontSize:10,fontWeight:800,background:sp.bg,color:sp.text }}>{sp.code}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:"#111" }}>{stats[sp.code]}</span>
                      <span style={{ fontSize:10,color:"#9CA3AF" }}>dias</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex",gap:12,fontSize:11,color:"#6B7280" }}>
                  <span>Total dias de ausência: <strong style={{ color:"#111" }}>{totalAusenciaDays}</strong></span>
                  {nextAus && (
                    <span style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <Calendar size={11}/>
                      Próxima: <strong style={{ color:"#4F46E5" }}>{nextAus.codigo} {fmtDate(nextAus.data_inicio)}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ background:"#F8FAFC",borderRadius:12,padding:"13px 15px",border:"1px solid #E5E7EB" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>
                  Ausências <span style={{ color:"#9CA3AF",fontWeight:400,fontSize:11 }}>({filtered.length})</span>
                </div>
                {/* Filter chips */}
                <div style={{ display:"flex",gap:4 }}>
                  <button onClick={() => { setFilterCode(null); setPage(0) }}
                    style={{ padding:"3px 9px",borderRadius:99,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:!filterCode?"#1E3A5F":"#E5E7EB",color:!filterCode?"#fff":"#374151" }}>
                    Todos
                  </button>
                  {SPECIAL.filter(sp => stats[sp.code]).map(sp => (
                    <button key={sp.code} onClick={() => { setFilterCode(filterCode===sp.code?null:sp.code); setPage(0) }}
                      style={{ padding:"3px 9px",borderRadius:99,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:filterCode===sp.code?sp.bg:"#E5E7EB",color:filterCode===sp.code?sp.text:"#374151" }}>
                      {sp.code}
                    </button>
                  ))}
                </div>
              </div>

              {ausLoading ? (
                <div style={{ textAlign:"center",padding:"20px 0",color:"#9CA3AF",fontSize:13 }}>A carregar…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:"center",padding:"20px 0",color:"#9CA3AF",fontSize:13 }}>Sem ausências{filterCode ? ` do tipo ${filterCode}` : ""}</div>
              ) : (
                <>
                  <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:10 }}>
                    {paginated.map(a => {
                      const sp   = SPECIAL.find(s=>s.code===a.codigo)
                      const days = differenceInDays(parseISO(a.data_fim), parseISO(a.data_inicio)) + 1
                      const past = parseISO(a.data_fim) < new Date()
                      return (
                        <div key={a.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:9,padding:"9px 12px",border:"1px solid #E5E7EB",opacity:past?0.7:1 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                            <span style={{ padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:800,background:sp?.bg??"#F3F4F6",color:sp?.text??"#374151",flexShrink:0 }}>{a.codigo}</span>
                            <div>
                              <div style={{ fontSize:11,fontWeight:600,color:"#111" }}>{fmtDate(a.data_inicio)} → {fmtDate(a.data_fim)}</div>
                              <div style={{ fontSize:10,color:"#6B7280",marginTop:1 }}>
                                {sp?.label ?? a.codigo} · {days} {days===1?"dia":"dias"}
                                {past && <span style={{ marginLeft:6,color:"#D1D5DB",fontWeight:600 }}>· concluída</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => deleteAusencia(a)} disabled={deleting===a.id}
                            style={{ border:"none",background:"none",cursor:"pointer",color:"#EF4444",padding:4,borderRadius:6,display:"flex",flexShrink:0 }}>
                            {deleting===a.id ? <span style={{ fontSize:11 }}>…</span> : <Trash2 size={14}/>}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
                        style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,border:"1px solid #E5E7EB",cursor:page===0?"not-allowed":"pointer",background:"#fff",color:page===0?"#D1D5DB":"#374151",fontSize:12,fontWeight:600 }}>
                        <ChevronLeft size={13}/> Anterior
                      </button>
                      <span style={{ fontSize:11,color:"#9CA3AF" }}>
                        {page+1} / {totalPages}
                      </span>
                      <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
                        style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,border:"1px solid #E5E7EB",cursor:page===totalPages-1?"not-allowed":"pointer",background:"#fff",color:page===totalPages-1?"#D1D5DB":"#374151",fontSize:12,fontWeight:600 }}>
                        Próximo <ChevronRight size={13}/>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>}

        </div>
      </div>
      <style>{`@keyframes auxSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }`}</style>
    </>
  )
}
