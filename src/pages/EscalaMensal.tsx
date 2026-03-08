import { useEffect, useState } from "react"
import { format, getDaysInMonth, startOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Download, MessageCircle, X, Search } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Turno, Escala } from "@/types"
import { Button } from "@/components/ui/button"

const ESPECIAIS = [
  { value: "descanso", code: "D",   label: "Descanso",              cls: "text-gray-500  bg-gray-50   hover:bg-gray-100"   },
  { value: "folga",    code: "F",   label: "Folga",                 cls: "text-yellow-700 bg-yellow-50 hover:bg-yellow-100" },
  { value: "ferias",   code: "Fe",  label: "Férias",                cls: "text-orange-700 bg-orange-50 hover:bg-orange-100" },
  { value: "licenca",  code: "L",   label: "Licença",               cls: "text-blue-600  bg-blue-50   hover:bg-blue-100"   },
]

const ESPECIAL_CODE: Record<string, { code: string; bg: string; text: string }> = {
  descanso: { code: "D",  bg: "bg-gray-100",    text: "text-gray-500"   },
  folga:    { code: "F",  bg: "bg-white",        text: "text-gray-500"   },
  ferias:   { code: "Fe", bg: "bg-yellow-200",   text: "text-yellow-800" },
  licenca:  { code: "L",  bg: "bg-gray-100",     text: "text-gray-500"   },
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

function shiftCellStyle(turno: Turno | undefined, especial: string | null | undefined) {
  if (especial && ESPECIAL_CODE[especial]) {
    const e = ESPECIAL_CODE[especial]
    return { bg: e.bg, text: e.text, code: e.code }
  }
  if (!turno) return { bg: "bg-white", text: "text-gray-200", code: "" }
  const nome = turno.nome
  if (nome.startsWith("N"))   return { bg: "bg-blue-700",    text: "text-white",         code: nome }
  if (nome === "FAA")         return { bg: "bg-orange-200",  text: "text-orange-900",    code: nome }
  if (nome.startsWith("MT"))  return { bg: "bg-teal-100",    text: "text-teal-900",      code: nome }
  if (nome.startsWith("T"))   return { bg: "bg-indigo-200",  text: "text-indigo-900",    code: nome }
  if (nome.startsWith("M"))   return { bg: "bg-white",       text: "text-gray-800",      code: nome }
  return { bg: "bg-white", text: "text-gray-700", code: nome }
}

const SUMMARY_COLS = [
  { key: "saldo_ant",  label: "Saldo anterior", width: "w-16" },
  { key: "saldo_mes",  label: "Saldo Mês",      width: "w-16" },
  { key: "saldo_fin",  label: "Saldo Final",    width: "w-16" },
  { key: "b_comp",     label: "B. Comp.",        width: "w-12" },
  { key: "he",         label: "H.E.",            width: "w-12" },
  { key: "fer",        label: "Fer",             width: "w-10" },
  { key: "tl",         label: "TL",              width: "w-10" },
  { key: "folgas_he",  label: "Folgas (HE)",     width: "w-16" },
]

export default function EscalaMensal() {
  const [currentDate, setCurrentDate]     = useState(() => new Date())
  const [auxiliares,  setAuxiliares]      = useState<Auxiliar[]>([])
  const [turnos,      setTurnos]          = useState<Turno[]>([])
  const [escalas,     setEscalas]         = useState<Escala[]>([])
  const [loading,     setLoading]         = useState(true)
  const [dropdownOpen, setDropdownOpen]   = useState(false)
  const [selectedCell, setSelectedCell]   = useState<{ auxiliarId: string; data: string } | null>(null)
  const [search, setSearch]               = useState("")

  const year        = currentDate.getFullYear()
  const month       = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(new Date(year, month))
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }
  function dayOfWeek(day: number) {
    return DIAS_SEMANA[new Date(year, month, day).getDay()]
  }
  function isWeekend(day: number) {
    const d = new Date(year, month, day).getDay()
    return d === 0 || d === 6
  }

  async function fetchAll() {
    setLoading(true)
    const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd")
    const endDate   = dateStr(daysInMonth)
    const [{ data: a }, { data: t }, { data: e }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("turnos").select("*").order("horario_inicio"),
      supabase.from("escalas")
        .select("*, turno:turnos(*)")
        .eq("tipo_escala", "mensal")
        .gte("data", startDate)
        .lte("data", endDate),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setEscalas((e ?? []) as Escala[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [year, month])

  function getEscala(auxiliarId: string, day: number) {
    const d = dateStr(day)
    return escalas.find(e => e.auxiliar_id === auxiliarId && e.data === d)
  }

  function openDropdown(auxiliarId: string, day: number) {
    setSelectedCell({ auxiliarId, data: dateStr(day) })
    setSearch("")
    setDropdownOpen(true)
  }

  async function assignTurno(turnoId: string | null, especial: string | null) {
    if (!selectedCell) return
    const existing = escalas.find(e => e.auxiliar_id === selectedCell.auxiliarId && e.data === selectedCell.data)
    const payload = {
      auxiliar_id: selectedCell.auxiliarId,
      data:        selectedCell.data,
      tipo_escala: "mensal" as const,
      turno_id:    turnoId,
      status:      turnoId ? "alocado" : "disponivel",
      especial:    especial ?? null,
    }
    if (existing) {
      await supabase.from("escalas").update(payload).eq("id", existing.id)
    } else {
      await supabase.from("escalas").insert(payload)
    }
    setDropdownOpen(false)
    fetchAll()
  }

  async function clearEscala() {
    if (!selectedCell) return
    const existing = escalas.find(e => e.auxiliar_id === selectedCell.auxiliarId && e.data === selectedCell.data)
    if (existing) await supabase.from("escalas").delete().eq("id", existing.id)
    setDropdownOpen(false)
    fetchAll()
  }

  // Sumários por auxiliar
  function calcSummary(aux: Auxiliar) {
    const ferDays   = days.filter(d => getEscala(aux.id, d)?.especial === "ferias").length
    const folgaDays = days.filter(d => getEscala(aux.id, d)?.especial === "folga").length
    return { fer: ferDays, folgas: folgaDays }
  }

  function handleExportPDF() { window.print() }

  function handleWhatsApp() {
    const mesAno = format(currentDate, "MMMM yyyy", { locale: ptBR })
    let texto = `📅 *Horário Mensal – ${mesAno}*\n\n`
    auxiliares.forEach(aux => {
      const items = days
        .map(d => {
          const e = getEscala(aux.id, d)
          if (!e) return null
          if (e.especial) return `  Dia ${d}: ${ESPECIAL_CODE[e.especial]?.code ?? e.especial}`
          const t = e.turno as Turno | undefined
          return t ? `  Dia ${d}: ${t.nome}` : null
        })
        .filter(Boolean)
      if (items.length) texto += `*${aux.nome}*\n${items.join("\n")}\n\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")
  }

  const filteredTurnos = turnos.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase())
  )

  // Column header background
  const dayHeaderBg = (day: number) =>
    isWeekend(day) ? "bg-gray-300 text-gray-700" : "bg-gray-200 text-gray-600"

  const dayCellBg = (day: number) =>
    isWeekend(day) ? "bg-gray-50" : "bg-white"

  return (
    <div>
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-base font-bold text-gray-900 uppercase tracking-wide">
            Imagiologia – {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Horário atual</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Este mês
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button
            variant="outline" size="sm" onClick={handleWhatsApp}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">A carregar...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-300 rounded shadow-sm">
          <table
            className="text-[10px] border-collapse"
            style={{ minWidth: `${160 + daysInMonth * 30 + SUMMARY_COLS.length * 50}px` }}
          >
            <thead>
              {/* Linha 1 — cabeçalhos dos dias */}
              <tr>
                <th className="sticky left-0 z-20 bg-gray-200 border border-gray-400 px-2 py-1 font-bold text-gray-700 text-center min-w-[44px]">
                  Nº
                </th>
                <th className="sticky left-11 z-20 bg-gray-200 border border-gray-400 px-2 py-1 font-bold text-gray-700 text-left min-w-[120px]">
                  Nome
                </th>
                {days.map(d => (
                  <th
                    key={d}
                    className={`border border-gray-300 px-0.5 py-1 text-center font-bold w-7 ${dayHeaderBg(d)}`}
                  >
                    {d}
                  </th>
                ))}
                {/* Colunas de sumário */}
                {SUMMARY_COLS.map(col => (
                  <th
                    key={col.key}
                    className={`border border-gray-400 px-1 py-1 text-center font-bold text-gray-700 bg-gray-200 ${col.width}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
              {/* Linha 2 — dia da semana */}
              <tr>
                <th className="sticky left-0 z-20 bg-gray-100 border border-gray-300 px-1 py-0.5" />
                <th className="sticky left-11 z-20 bg-gray-100 border border-gray-300 px-1 py-0.5" />
                {days.map(d => (
                  <th
                    key={d}
                    className={`border border-gray-200 px-0.5 py-0.5 text-center font-normal w-7 ${
                      isWeekend(d) ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {dayOfWeek(d)}
                  </th>
                ))}
                {SUMMARY_COLS.map(col => (
                  <th key={col.key} className="border border-gray-200 bg-gray-100 px-1 py-0.5" />
                ))}
              </tr>
            </thead>
            <tbody>
              {auxiliares.map((aux, idx) => {
                const summary = calcSummary(aux)
                return (
                  <tr
                    key={aux.id}
                    className={`border-b border-gray-200 ${idx % 2 === 0 ? "" : "bg-gray-50/40"}`}
                  >
                    {/* Nº mecanográfico */}
                    <td className="sticky left-0 z-10 bg-white border border-gray-200 px-1 py-1 text-center text-gray-500 font-mono">
                      {aux.numero_mecanografico ?? "—"}
                    </td>
                    {/* Nome */}
                    <td className="sticky left-11 z-10 bg-white border-r border-gray-300 border-y border-gray-200 px-2 py-1 font-medium text-gray-800 whitespace-nowrap">
                      {aux.nome}
                    </td>
                    {/* Células dos dias */}
                    {days.map(d => {
                      const escala = getEscala(aux.id, d)
                      const turno  = escala?.turno as Turno | undefined
                      const style  = shiftCellStyle(turno, escala?.especial)
                      return (
                        <td
                          key={d}
                          onClick={() => openDropdown(aux.id, d)}
                          title={turno?.nome ?? escala?.especial ?? ""}
                          className={`border border-gray-100 text-center cursor-pointer font-bold w-7 h-7 transition-colors hover:opacity-75 ${
                            style.code ? `${style.bg} ${style.text}` : `${dayCellBg(d)} text-gray-200`
                          }`}
                        >
                          {style.code || ""}
                        </td>
                      )
                    })}
                    {/* Sumários */}
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">00:00</td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">00:00</td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">00:00</td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">00:00</td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">00:00</td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-700 font-medium">
                      {summary.fer > 0 ? summary.fer : ""}
                    </td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">0</td>
                    <td className="border border-gray-200 px-1 py-1 text-center text-gray-700 font-medium">
                      {summary.folgas > 0 ? summary.folgas : ""}
                    </td>
                  </tr>
                )
              })}
              {auxiliares.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 2 + SUMMARY_COLS.length} className="text-center text-gray-400 py-8">
                    Nenhum auxiliar cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        {ESPECIAIS.map(e => (
          <span key={e.value} className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded font-bold ${e.cls}`}>{e.code}</span>
            {e.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-bold bg-blue-700 text-white">N</span>
          Noite
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-bold bg-indigo-200 text-indigo-900">T</span>
          Tarde
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-bold bg-white border text-gray-700">M</span>
          Manhã
        </span>
      </div>

      {/* Dropdown popup */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setDropdownOpen(false)}>
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-50 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  {selectedCell &&
                    auxiliares.find(a => a.id === selectedCell.auxiliarId)?.nome}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {selectedCell &&
                    format(new Date(selectedCell.data + "T12:00:00"), "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
                </div>
              </div>
              <button onClick={() => setDropdownOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              {/* Pesquisa */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar turno..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-200"
                  autoFocus
                />
              </div>

              {/* Lista de turnos */}
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredTurnos.length === 0 && search ? (
                  <div className="text-xs text-gray-400 text-center py-6">Nenhum turno encontrado</div>
                ) : (
                  filteredTurnos.map(t => {
                    const s = shiftCellStyle(t, null)
                    return (
                      <button
                        key={t.id}
                        onClick={() => assignTurno(t.id, null)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${s.bg} ${s.text} border border-gray-100 min-w-[30px] text-center`}>
                          {t.nome}
                        </span>
                        <span className="text-gray-500">
                          {t.horario_inicio.slice(0, 5)} – {t.horario_fim.slice(0, 5)}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Opções especiais */}
              {!search && (
                <>
                  <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
                    <div className="text-[10px] font-semibold text-gray-400 px-3 mb-1 uppercase tracking-wider">
                      Especial
                    </div>
                    {ESPECIAIS.map(esp => (
                      <button
                        key={esp.value}
                        onClick={() => assignTurno(null, esp.value)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${esp.cls}`}
                      >
                        <span className="font-bold w-6 text-center">{esp.code}</span>
                        <span>{esp.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={clearEscala}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ✕ Limpar célula
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
