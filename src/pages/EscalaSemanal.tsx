import { useEffect, useState } from "react"
import { format, startOfWeek, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, X, Search, Plus, Printer, MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Doutor, SlotSemanal } from "@/types"
import { Button } from "@/components/ui/button"

const SECOES = [
  { key: "rx_urg",      label: "RX URG",             group: null,                    headerBg: "bg-yellow-200", cellBg: "bg-orange-100"  },
  { key: "tac1",        label: "TAC 1",               group: null,                    headerBg: "bg-yellow-200", cellBg: "bg-orange-100"  },
  { key: "tac2",        label: "TAC 2",               group: null,                    headerBg: "bg-yellow-200", cellBg: "bg-green-100"   },
  { key: "exames1",     label: "",                    group: "Exames Complementares", headerBg: "bg-gray-300",   cellBg: "bg-gray-200"    },
  { key: "exames2",     label: "",                    group: "Exames Complementares", headerBg: "bg-gray-300",   cellBg: "bg-gray-200"    },
  { key: "rx_sala6",    label: "SALA 6 BB",           group: "RX",                    headerBg: "bg-teal-200",   cellBg: "bg-teal-100"    },
  { key: "sala7_ext",   label: "SALA 7 EXT",          group: "RX",                    headerBg: "bg-teal-200",   cellBg: "bg-teal-100"    },
  { key: "transportes", label: "Transportes INT/URG", group: null,                    headerBg: "bg-yellow-200", cellBg: "bg-orange-100"  },
]

const TURNOS_TIPO = ["N", "M", "T"] as const
const DIAS_LABEL = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

type ModalMode = "doutor1" | "doutor2" | "auxiliar"

function turnoStyle(t: string) {
  if (t === "N") return { bg: "bg-blue-200",   text: "text-blue-900",   label: "N" }
  if (t === "M") return { bg: "bg-green-200",  text: "text-green-900",  label: "M" }
  return                { bg: "bg-orange-200", text: "text-orange-900", label: "T" }
}

export default function EscalaSemanal() {
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [doutores, setDoutores] = useState<Doutor[]>([])
  const [slots, setSlots] = useState<SlotSemanal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>("doutor1")
  const [selectedCell, setSelectedCell] = useState<{ data: string; turnoTipo: string; secao: string } | null>(null)
  const [search, setSearch] = useState("")

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  async function fetchAll() {
    setLoading(true)
    const startDate = format(weekDays[0], "yyyy-MM-dd")
    const endDate   = format(weekDays[6], "yyyy-MM-dd")
    const [{ data: a }, { data: d }, { data: s }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("doutores").select("*").order("nome"),
      supabase.from("escalas_semanais")
        .select(`
          *,
          auxiliar:auxiliares(*),
          doutor:doutores!escalas_semanais_doutor_id_fkey(*),
          doutor2:doutores!escalas_semanais_doutor2_id_fkey(*)
        `)
        .gte("data", startDate)
        .lte("data", endDate),
    ])
    setAuxiliares(a ?? [])
    setDoutores(d ?? [])
    setSlots((s ?? []) as SlotSemanal[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [weekStart.toISOString()])

  function getSlot(data: string, turnoTipo: string, secao: string) {
    return slots.find(s => s.data === data && s.turno_tipo === turnoTipo && s.secao === secao)
  }

  function openModal(data: string, turnoTipo: string, secao: string, mode: ModalMode) {
    setSelectedCell({ data, turnoTipo, secao })
    setModalMode(mode)
    setSearch("")
    setModalOpen(true)
  }

  async function assignDoutor(doutorId: string | null, field: "doutor_id" | "doutor2_id") {
    if (!selectedCell) return
    setSaving(true)
    const existing = getSlot(selectedCell.data, selectedCell.turnoTipo, selectedCell.secao)
    if (existing) {
      await supabase.from("escalas_semanais").update({ [field]: doutorId }).eq("id", existing.id)
    } else {
      await supabase.from("escalas_semanais").insert({
        data: selectedCell.data,
        turno_tipo: selectedCell.turnoTipo,
        secao: selectedCell.secao,
        [field]: doutorId,
        auxiliar_id: null,
        especial: null,
      })
    }
    setModalOpen(false)
    setSaving(false)
    fetchAll()
  }

  async function assignAuxiliar(auxiliarId: string | null) {
    if (!selectedCell) return
    setSaving(true)
    const existing = getSlot(selectedCell.data, selectedCell.turnoTipo, selectedCell.secao)
    if (existing) {
      await supabase.from("escalas_semanais").update({ auxiliar_id: auxiliarId }).eq("id", existing.id)
    } else {
      await supabase.from("escalas_semanais").insert({
        data: selectedCell.data,
        turno_tipo: selectedCell.turnoTipo,
        secao: selectedCell.secao,
        auxiliar_id: auxiliarId,
        doutor_id: null,
        doutor2_id: null,
        especial: null,
      })
    }
    setModalOpen(false)
    setSaving(false)
    fetchAll()
  }

  async function clearCell() {
    if (!selectedCell) return
    const existing = getSlot(selectedCell.data, selectedCell.turnoTipo, selectedCell.secao)
    if (existing) {
      await supabase.from("escalas_semanais").delete().eq("id", existing.id)
    }
    setModalOpen(false)
    fetchAll()
  }

  // Gerar escala: copia da semana anterior
  async function gerarEscala() {
    const prevStart = format(addDays(weekDays[0], -7), "yyyy-MM-dd")
    const prevEnd   = format(addDays(weekDays[6], -7), "yyyy-MM-dd")
    const { data: prevSlots } = await supabase
      .from("escalas_semanais")
      .select("*")
      .gte("data", prevStart)
      .lte("data", prevEnd)

    if (!prevSlots?.length) {
      alert("Sem dados da semana anterior para gerar escala.")
      return
    }

    let inserted = 0
    for (const ps of prevSlots) {
      const newDate = format(addDays(new Date(ps.data + "T12:00:00"), 7), "yyyy-MM-dd")
      const existing = getSlot(newDate, ps.turno_tipo, ps.secao)
      if (!existing) {
        await supabase.from("escalas_semanais").insert({
          data: newDate,
          turno_tipo: ps.turno_tipo,
          secao: ps.secao,
          auxiliar_id: ps.auxiliar_id,
          doutor_id: ps.doutor_id,
          doutor2_id: ps.doutor2_id,
          especial: ps.especial,
        })
        inserted++
      }
    }
    await fetchAll()
    alert(`Escala gerada! ${inserted} slot(s) copiado(s) da semana anterior.`)
  }

  // Compartilhar no WhatsApp
  function shareWhatsApp() {
    const titulo = `Escala ${format(weekDays[0], "d")} a ${format(weekDays[6], "d 'de' MMMM yyyy", { locale: ptBR })}`
    let text = `*${titulo}*\n\n`

    weekDays.forEach((day, di) => {
      const dataStr = format(day, "yyyy-MM-dd")
      text += `*${format(day, "d")} - ${DIAS_LABEL[di]}*\n`
      TURNOS_TIPO.forEach(turno => {
        const partes: string[] = []
        SECOES.forEach(secao => {
          const slot = getSlot(dataStr, turno, secao.key)
          if (!slot) return
          const nomes: string[] = []
          if ((slot.doutor as Doutor | undefined)?.nome) nomes.push(`Dr. ${(slot.doutor as Doutor).nome}`)
          if ((slot.doutor2 as Doutor | undefined)?.nome) nomes.push((slot.doutor2 as Doutor).nome)
          if ((slot.auxiliar as Auxiliar | undefined)?.nome) nomes.push((slot.auxiliar as Auxiliar).nome)
          if (slot.especial) nomes.push(slot.especial.toUpperCase())
          if (nomes.length) {
            const label = secao.label || secao.key
            partes.push(`${label}: ${nomes.join(" / ")}`)
          }
        })
        if (partes.length) text += `  ${turno}: ${partes.join(" | ")}\n`
      })
      text += "\n"
    })

    const encoded = encodeURIComponent(text)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank")
  }

  const filteredDoutores = doutores.filter(d =>
    d.nome.toLowerCase().includes(search.toLowerCase())
  )
  const filteredAuxiliares = auxiliares.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  )

  const currentSlot = selectedCell
    ? getSlot(selectedCell.data, selectedCell.turnoTipo, selectedCell.secao)
    : undefined

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-base font-bold text-gray-900 uppercase tracking-wide">
          Escala semana {format(weekDays[0], "d")} a {format(weekDays[6], "d")} de{" "}
          {format(weekDays[6], "MMMM yyyy", { locale: ptBR })}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegar semanas */}
          <Button variant="outline" size="icon" onClick={() => setReferenceDate(d => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())}>
            Esta semana
          </Button>
          <Button variant="outline" size="icon" onClick={() => setReferenceDate(d => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Gerar Escala */}
          <Button
            variant="default"
            size="sm"
            onClick={gerarEscala}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Gerar Escala Semanal
          </Button>

          {/* Compartilhar WhatsApp */}
          <Button
            variant="default"
            size="sm"
            onClick={shareWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Compartilhar no WhatsApp
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">A carregar...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-500 rounded shadow-sm">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
            <thead>
              {/* Linha 1 — grupos */}
              <tr>
                <th colSpan={2} className="border border-gray-500 bg-gray-200" />
                <th className="border border-gray-500 px-2 py-1.5 font-bold text-center bg-yellow-200">RX URG</th>
                <th className="border border-gray-500 px-2 py-1.5 font-bold text-center bg-yellow-200">TAC 1</th>
                <th className="border border-gray-500 px-2 py-1.5 font-bold text-center bg-yellow-200">TAC 2</th>
                <th colSpan={2} className="border border-gray-500 px-2 py-1.5 font-bold text-center bg-gray-300">
                  Exames Complementares
                </th>
                <th colSpan={2} className="border border-gray-500 px-2 py-1.5 font-bold text-center bg-teal-200">
                  RX
                </th>
                <th className="border border-gray-500 px-2 py-1.5 font-bold text-center bg-yellow-200">
                  Transportes<br />INT/URG
                </th>
              </tr>
              {/* Linha 2 — sub-headers */}
              <tr>
                <th className="border border-gray-500 px-1 py-1 bg-gray-100 text-gray-500 font-normal text-left min-w-[60px] text-[10px]">Data</th>
                <th className="border border-gray-500 px-1 py-1 bg-gray-100 text-gray-600 font-bold text-center w-6">T</th>
                <th className="border border-gray-500 bg-yellow-100 min-w-[90px]" />
                <th className="border border-gray-500 bg-yellow-100 min-w-[90px]" />
                <th className="border border-gray-500 bg-yellow-100 min-w-[80px]" />
                <th className="border border-gray-500 px-2 py-1 text-center text-gray-500 font-normal bg-gray-200 min-w-[110px]">Col. I</th>
                <th className="border border-gray-500 px-2 py-1 text-center text-gray-500 font-normal bg-gray-200 min-w-[110px]">Col. J</th>
                <th className="border border-gray-500 px-2 py-1 text-center font-semibold bg-teal-100 min-w-[80px]">SALA 6 BB</th>
                <th className="border border-gray-500 px-2 py-1 text-center font-semibold bg-teal-100 min-w-[80px]">SALA 7 EXT</th>
                <th className="border border-gray-500 bg-yellow-100 min-w-[90px]" />
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day, dayIndex) =>
                TURNOS_TIPO.map((turno, turnoIndex) => {
                  const dataStr = format(day, "yyyy-MM-dd")
                  const ts = turnoStyle(turno)
                  return (
                    <tr key={`${dayIndex}-${turno}`} className="border-b border-gray-300">
                      {/* Dia (rowspan 3) */}
                      {turnoIndex === 0 && (
                        <td
                          rowSpan={3}
                          className="border border-gray-500 px-1 py-1 text-center bg-gray-100 font-bold text-gray-800 whitespace-nowrap align-middle min-w-[60px]"
                        >
                          <div className="text-sm font-bold">{format(day, "d")}</div>
                          <div className="text-[10px] font-normal text-gray-500">{DIAS_LABEL[dayIndex]}</div>
                        </td>
                      )}
                      {/* Turno */}
                      <td className={`border border-gray-500 px-1 py-1 text-center font-bold w-6 ${ts.bg} ${ts.text}`}>
                        {turno}
                      </td>
                      {/* Células */}
                      {SECOES.map(secao => {
                        const slot = getSlot(dataStr, turno, secao.key)
                        const d1 = slot?.doutor as Doutor | undefined
                        const d2 = slot?.doutor2 as Doutor | undefined
                        const aux = slot?.auxiliar as Auxiliar | undefined
                        const hasDoctor = !!(d1 || d2)
                        const isExames = secao.key === "exames1" || secao.key === "exames2"

                        return (
                          <td
                            key={secao.key}
                            className={`border border-gray-300 px-0 py-0 align-top ${secao.cellBg}`}
                          >
                            <div className="flex flex-col min-h-[36px]">
                              {/* Zona doutores — visível sempre nas colunas exames, ou quando há doutor */}
                              {(isExames || hasDoctor) && (
                                <div className="flex items-center bg-gray-500 text-white px-1.5 py-0.5 min-h-[18px]">
                                  {/* Doutor 1 */}
                                  <span
                                    className="flex-1 cursor-pointer hover:underline truncate font-semibold text-[10px] uppercase"
                                    title={d1 ? d1.nome : "Clique para selecionar doutor"}
                                    onClick={() => openModal(dataStr, turno, secao.key, "doutor1")}
                                  >
                                    {d1 ? d1.nome : <span className="text-gray-300 font-normal">Dr. ...</span>}
                                  </span>
                                  {/* Doutor 2 ou botão + */}
                                  {d2 ? (
                                    <span
                                      className="cursor-pointer hover:underline text-[10px] ml-1 truncate max-w-[60px]"
                                      title={d2.nome}
                                      onClick={() => openModal(dataStr, turno, secao.key, "doutor2")}
                                    >
                                      | {d2.nome}
                                    </span>
                                  ) : (
                                    <button
                                      className="ml-1 text-gray-300 hover:text-white flex-shrink-0"
                                      title="Adicionar outro doutor"
                                      onClick={e => { e.stopPropagation(); openModal(dataStr, turno, secao.key, "doutor2") }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                              {/* Zona auxiliar */}
                              <div
                                className={`flex-1 px-1.5 py-0.5 cursor-pointer hover:brightness-95 min-h-[18px] flex items-center ${secao.cellBg}`}
                                title={aux ? aux.nome : "Clique para selecionar auxiliar"}
                                onClick={() => openModal(dataStr, turno, secao.key, "auxiliar")}
                              >
                                <span className="font-semibold text-[10px] uppercase text-gray-800 truncate">
                                  {aux ? aux.nome : (
                                    !isExames && !hasDoctor
                                      ? <span className="text-gray-300 font-normal">–</span>
                                      : <span className="text-gray-400 font-normal text-[9px]">auxiliar</span>
                                  )}
                                </span>
                              </div>
                            </div>
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

      {/* Modal de seleção */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setModalOpen(false)}>
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-50 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  {modalMode === "doutor1" && "Selecionar Doutor"}
                  {modalMode === "doutor2" && "Adicionar 2.º Doutor"}
                  {modalMode === "auxiliar" && "Selecionar Auxiliar"}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {selectedCell && `Turno ${selectedCell.turnoTipo} · ${format(new Date(selectedCell.data + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}`}
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              {/* Pesquisa */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={modalMode === "auxiliar" ? "Pesquisar auxiliar..." : "Pesquisar doutor..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>

              {/* Lista */}
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {modalMode !== "auxiliar" ? (
                  filteredDoutores.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-6">Nenhum doutor encontrado</div>
                  ) : (
                    filteredDoutores.map(d => (
                      <button
                        key={d.id}
                        onClick={() => assignDoutor(d.id, modalMode === "doutor1" ? "doutor_id" : "doutor2_id")}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg transition-colors text-gray-700 flex items-center justify-between"
                      >
                        <span className="font-medium">{d.nome}</span>
                        {d.numero_mecanografico && (
                          <span className="text-xs text-gray-400">#{d.numero_mecanografico}</span>
                        )}
                      </button>
                    ))
                  )
                ) : (
                  filteredAuxiliares.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-6">Nenhum auxiliar encontrado</div>
                  ) : (
                    filteredAuxiliares.map(a => (
                      <button
                        key={a.id}
                        onClick={() => assignAuxiliar(a.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 rounded-lg transition-colors text-gray-700 flex items-center justify-between"
                      >
                        <span>{a.nome}</span>
                        {a.numero_mecanografico && (
                          <span className="text-xs text-gray-400">#{a.numero_mecanografico}</span>
                        )}
                      </button>
                    ))
                  )
                )}
              </div>

              {/* Ações de limpeza */}
              {!search && (
                <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
                  {modalMode === "doutor1" && currentSlot?.doutor_id && (
                    <button
                      onClick={() => assignDoutor(null, "doutor_id")}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ✕ Remover doutor
                    </button>
                  )}
                  {modalMode === "doutor2" && currentSlot?.doutor2_id && (
                    <button
                      onClick={() => assignDoutor(null, "doutor2_id")}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ✕ Remover 2.º doutor
                    </button>
                  )}
                  {modalMode === "auxiliar" && currentSlot?.auxiliar_id && (
                    <button
                      onClick={() => assignAuxiliar(null)}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ✕ Remover auxiliar
                    </button>
                  )}
                  {currentSlot && (
                    <button
                      onClick={clearCell}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                      ✕ Limpar célula completa
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
          A guardar...
        </div>
      )}
    </div>
  )
}
