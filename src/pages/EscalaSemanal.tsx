import { useEffect, useState } from "react"
import { format, startOfWeek, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, X, Search } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, SlotSemanal } from "@/types"
import { Button } from "@/components/ui/button"

// Seções/departamentos da escala semanal (baseado na imagem)
const SECOES = [
  { key: "rx_urg",      label: "RX URG",            group: null,                    cellBg: "bg-orange-50",  hoverBg: "hover:bg-orange-100"  },
  { key: "tac1",        label: "TAC 1",              group: null,                    cellBg: "bg-orange-50",  hoverBg: "hover:bg-orange-100"  },
  { key: "tac2",        label: "TAC 2",              group: null,                    cellBg: "bg-green-50",   hoverBg: "hover:bg-green-100"   },
  { key: "exames1",     label: "",                   group: "Exames Complementares", cellBg: "bg-gray-100",   hoverBg: "hover:bg-gray-200"    },
  { key: "exames2",     label: "",                   group: "Exames Complementares", cellBg: "bg-gray-100",   hoverBg: "hover:bg-gray-200"    },
  { key: "rx_sala6",    label: "SALA 6 BB",          group: "RX",                    cellBg: "bg-teal-50",    hoverBg: "hover:bg-teal-100"    },
  { key: "sala7_ext",   label: "SALA 7 EXT",         group: "RX",                    cellBg: "bg-teal-50",    hoverBg: "hover:bg-teal-100"    },
  { key: "transportes", label: "Transportes INT/URG", group: null,                   cellBg: "bg-orange-50",  hoverBg: "hover:bg-orange-100"  },
]

const TURNOS_TIPO = ["N", "M", "T"] as const
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

const ESPECIAIS = [
  { value: "folga",    label: "Folga (F)",      cls: "text-yellow-700 bg-yellow-50 hover:bg-yellow-100"  },
  { value: "ferias",   label: "Férias (Fe)",     cls: "text-purple-700 bg-purple-50 hover:bg-purple-100" },
  { value: "descanso", label: "Descanso (D)",    cls: "text-gray-600   bg-gray-50   hover:bg-gray-100"   },
  { value: "licenca",  label: "Licença (L)",     cls: "text-blue-600   bg-blue-50   hover:bg-blue-100"   },
]

const ESPECIAL_CODE: Record<string, string> = {
  folga: "F", ferias: "Fe", descanso: "D", licenca: "L",
}

function turnoStyle(t: string) {
  if (t === "N") return { bg: "bg-blue-100",   text: "text-blue-800"   }
  if (t === "M") return { bg: "bg-green-100",  text: "text-green-800"  }
  return            { bg: "bg-orange-100", text: "text-orange-800" }
}

function cellClass(slot: SlotSemanal | undefined, secao: typeof SECOES[0]) {
  if (!slot) return `bg-white ${secao.hoverBg}`
  if (slot.especial === "folga")    return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
  if (slot.especial === "ferias")   return "bg-purple-100 text-purple-800 hover:bg-purple-200"
  if (slot.especial === "descanso") return "bg-gray-100   text-gray-600   hover:bg-gray-200"
  if (slot.especial === "licenca")  return "bg-blue-100   text-blue-700   hover:bg-blue-200"
  return `${secao.cellBg} text-gray-800 ${secao.hoverBg}`
}

export default function EscalaSemanal() {
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [slots, setSlots] = useState<SlotSemanal[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ data: string; turnoTipo: string; secao: string } | null>(null)
  const [search, setSearch] = useState("")

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  async function fetchAll() {
    setLoading(true)
    const startDate = format(weekDays[0], "yyyy-MM-dd")
    const endDate   = format(weekDays[6], "yyyy-MM-dd")
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("escalas_semanais")
        .select("*, auxiliar:auxiliares(*)")
        .gte("data", startDate)
        .lte("data", endDate),
    ])
    setAuxiliares(a ?? [])
    setSlots((s ?? []) as SlotSemanal[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [weekStart.toISOString()])

  function getSlot(data: string, turnoTipo: string, secao: string) {
    return slots.find(s => s.data === data && s.turno_tipo === turnoTipo && s.secao === secao)
  }

  function getDisplay(slot: SlotSemanal | undefined): string {
    if (!slot) return ""
    if (slot.especial) return ESPECIAL_CODE[slot.especial] ?? slot.especial
    return (slot.auxiliar as Auxiliar | undefined)?.nome ?? ""
  }

  function openDropdown(data: string, turnoTipo: string, secao: string) {
    setSelectedCell({ data, turnoTipo, secao })
    setSearch("")
    setDropdownOpen(true)
  }

  async function assign(auxiliarId: string | null, especial: string | null) {
    if (!selectedCell) return
    const existing = getSlot(selectedCell.data, selectedCell.turnoTipo, selectedCell.secao)
    const payload = {
      data:       selectedCell.data,
      turno_tipo: selectedCell.turnoTipo,
      secao:      selectedCell.secao,
      auxiliar_id: auxiliarId,
      especial,
    }
    if (existing) {
      await supabase.from("escalas_semanais").update(payload).eq("id", existing.id)
    } else {
      await supabase.from("escalas_semanais").insert(payload)
    }
    setDropdownOpen(false)
    fetchAll()
  }

  async function clearSlot() {
    if (!selectedCell) return
    const existing = getSlot(selectedCell.data, selectedCell.turnoTipo, selectedCell.secao)
    if (existing) await supabase.from("escalas_semanais").delete().eq("id", existing.id)
    setDropdownOpen(false)
    fetchAll()
  }

  const filtered = auxiliares.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  )

  const selectedSecaoLabel = selectedCell
    ? (SECOES.find(s => s.key === selectedCell.secao)?.label || selectedCell.secao)
    : ""

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-gray-900 uppercase tracking-wide">
          Escala semana {format(weekDays[0], "d")} a {format(weekDays[6], "d")} de{" "}
          {format(weekDays[6], "MMMM yyyy", { locale: ptBR })}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setReferenceDate(d => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())}>
            Esta semana
          </Button>
          <Button variant="outline" size="icon" onClick={() => setReferenceDate(d => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">A carregar...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-400 rounded shadow-sm">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 820 }}>
            <thead>
              {/* Linha 1 — grupos principais */}
              <tr className="bg-yellow-200">
                <th colSpan={2} className="border border-gray-400 px-2 py-2 bg-gray-200" />
                <th className="border border-gray-400 px-3 py-2 font-bold text-gray-800 text-center">RX URG</th>
                <th className="border border-gray-400 px-3 py-2 font-bold text-gray-800 text-center">TAC 1</th>
                <th className="border border-gray-400 px-3 py-2 font-bold text-gray-800 text-center">TAC 2</th>
                <th colSpan={2} className="border border-gray-400 px-3 py-2 font-bold text-gray-800 text-center">
                  Exames Complementares
                </th>
                <th colSpan={2} className="border border-gray-400 px-3 py-2 font-bold text-gray-800 text-center bg-teal-200">
                  RX
                </th>
                <th className="border border-gray-400 px-3 py-2 font-bold text-gray-800 text-center">
                  Transportes<br />INT/URG
                </th>
              </tr>
              {/* Linha 2 — sub-cabeçalhos */}
              <tr className="bg-yellow-100">
                <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-xs text-gray-500 text-left font-normal min-w-[64px]">
                  Data
                </th>
                <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-xs text-gray-500 text-center font-bold w-6">
                  T
                </th>
                <th className="border border-gray-400 px-2 py-1" />
                <th className="border border-gray-400 px-2 py-1" />
                <th className="border border-gray-400 px-2 py-1" />
                <th className="border border-gray-400 px-2 py-1 text-center text-gray-400 font-normal">Col. 1</th>
                <th className="border border-gray-400 px-2 py-1 text-center text-gray-400 font-normal">Col. 2</th>
                <th className="border border-gray-400 px-2 py-1 text-center font-semibold text-gray-700 bg-teal-100">
                  SALA 6 BB
                </th>
                <th className="border border-gray-400 px-2 py-1 text-center font-semibold text-gray-700 bg-teal-100">
                  SALA 7 EXT
                </th>
                <th className="border border-gray-400 px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day, dayIndex) =>
                TURNOS_TIPO.map((turno, turnoIndex) => {
                  const dataStr = format(day, "yyyy-MM-dd")
                  const ts = turnoStyle(turno)
                  return (
                    <tr key={`${dayIndex}-${turno}`} className="border-b border-gray-200">
                      {/* Célula do dia (rowSpan 3) */}
                      {turnoIndex === 0 && (
                        <td
                          rowSpan={3}
                          className="border border-gray-400 px-2 py-1 text-center bg-gray-100 font-bold text-gray-700 whitespace-nowrap align-middle min-w-[64px]"
                        >
                          <span className="text-sm">{format(day, "d")}</span>
                          <span className="text-xs font-normal text-gray-500"> - {DIAS[dayIndex]}</span>
                        </td>
                      )}
                      {/* Tipo turno */}
                      <td className={`border border-gray-400 px-1 py-1.5 text-center font-bold w-6 ${ts.bg} ${ts.text}`}>
                        {turno}
                      </td>
                      {/* Células das seções */}
                      {SECOES.map(secao => {
                        const slot = getSlot(dataStr, turno, secao.key)
                        const display = getDisplay(slot)
                        return (
                          <td
                            key={secao.key}
                            onClick={() => openDropdown(dataStr, turno, secao.key)}
                            title={display || "Clique para atribuir"}
                            className={`border border-gray-200 px-2 py-1.5 text-center cursor-pointer font-medium min-w-[80px] transition-colors ${cellClass(slot, secao)}`}
                          >
                            {display || <span className="text-gray-200 font-normal">–</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        {ESPECIAIS.map(e => (
          <span key={e.value} className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${e.cls}`}>{ESPECIAL_CODE[e.value]}</span>
            {e.label}
          </span>
        ))}
      </div>

      {/* Dropdown popup */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setDropdownOpen(false)}>
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-50 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho do dropdown */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  {selectedSecaoLabel || "Secção"}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {selectedCell &&
                    `${selectedCell.turnoTipo} · ${format(
                      new Date(selectedCell.data + "T12:00:00"),
                      "EEEE, d 'de' MMMM",
                      { locale: ptBR }
                    )}`}
                </div>
              </div>
              <button
                onClick={() => setDropdownOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              {/* Pesquisa */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar auxiliar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-200"
                  autoFocus
                />
              </div>

              {/* Lista de auxiliares */}
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filtered.length === 0 && search ? (
                  <div className="text-xs text-gray-400 text-center py-6">Nenhum auxiliar encontrado</div>
                ) : (
                  filtered.map(aux => (
                    <button
                      key={aux.id}
                      onClick={() => assign(aux.id, null)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 rounded-lg transition-colors text-gray-700 flex items-center justify-between"
                    >
                      <span>{aux.nome}</span>
                      {aux.numero_mecanografico && (
                        <span className="text-xs text-gray-400">#{aux.numero_mecanografico}</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Opções especiais (só quando não está a pesquisar) */}
              {!search && (
                <>
                  <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
                    <div className="text-[10px] font-semibold text-gray-400 px-3 mb-1 uppercase tracking-wider">
                      Especial
                    </div>
                    {ESPECIAIS.map(esp => (
                      <button
                        key={esp.value}
                        onClick={() => assign(null, esp.value)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${esp.cls}`}
                      >
                        {esp.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={clearSlot}
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
