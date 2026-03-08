import { useEffect, useState } from "react"
import { format, getDaysInMonth, startOfMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Download, MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Turno, Escala } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

export default function EscalaMensal() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ auxiliarId: string; data: string } | null>(null)
  const [selectedTurnoId, setSelectedTurnoId] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"disponivel" | "alocado" | "bloqueado">("alocado")

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(new Date(year, month))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  async function fetchAll() {
    setLoading(true)
    const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd")
    const endDate = format(new Date(year, month, daysInMonth), "yyyy-MM-dd")
    const [{ data: a }, { data: t }, { data: e }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("turnos").select("*").order("horario_inicio"),
      supabase.from("escalas").select("*, turno:turnos(*)").eq("tipo_escala", "mensal").gte("data", startDate).lte("data", endDate),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setEscalas(e ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [year, month])

  function getEscala(auxiliarId: string, day: number) {
    const data = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return escalas.find((e) => e.auxiliar_id === auxiliarId && e.data === data)
  }

  function openCell(auxiliarId: string, day: number) {
    const data = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const existing = getEscala(auxiliarId, day)
    setSelectedCell({ auxiliarId, data })
    setSelectedTurnoId(existing?.turno_id ?? "")
    setSelectedStatus(existing?.status ?? "alocado")
    setDialogOpen(true)
  }

  async function saveEscala() {
    if (!selectedCell) return
    const existing = escalas.find((e) => e.auxiliar_id === selectedCell.auxiliarId && e.data === selectedCell.data)
    const payload = {
      auxiliar_id: selectedCell.auxiliarId,
      data: selectedCell.data,
      tipo_escala: "mensal" as const,
      turno_id: selectedTurnoId || null,
      status: selectedStatus,
    }
    if (existing) {
      await supabase.from("escalas").update(payload).eq("id", existing.id)
    } else {
      await supabase.from("escalas").insert(payload)
    }
    setDialogOpen(false)
    fetchAll()
  }

  async function clearEscala() {
    if (!selectedCell) return
    const existing = escalas.find((e) => e.auxiliar_id === selectedCell.auxiliarId && e.data === selectedCell.data)
    if (existing) await supabase.from("escalas").delete().eq("id", existing.id)
    setDialogOpen(false)
    fetchAll()
  }

  function prevMonth() { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  function handleExportPDF() { window.print() }

  function handleWhatsApp() {
    const mesAno = format(currentDate, "MMMM yyyy", { locale: ptBR })
    let texto = `📅 *Horário Mensal – ${mesAno}*\n\n`
    auxiliares.forEach((aux) => {
      const turnosAux = days
        .map((d) => {
          const e = getEscala(aux.id, d)
          if (!e || e.status === "disponivel") return null
          const turno = e.turno as Turno | undefined
          return `  Dia ${d}: ${turno ? turno.nome : e.status}`
        })
        .filter(Boolean)
      if (turnosAux.length > 0) {
        texto += `*${aux.nome}*\n${turnosAux.join("\n")}\n\n`
      }
    })
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, "_blank")
  }

  const cellClass = (escala: Escala | undefined) => {
    if (!escala) return "bg-white hover:bg-gray-50"
    if (escala.status === "alocado") return "bg-primary-100 text-primary-800 hover:bg-primary-200"
    if (escala.status === "bloqueado") return "bg-red-100 text-red-700 hover:bg-red-200"
    return "bg-white hover:bg-gray-50"
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horário Mensal</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Este mês
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-700 border-green-300 hover:bg-green-50">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block" />
          Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary-100 inline-block" />
          Alocado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 inline-block" />
          Bloqueado
        </span>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">A carregar...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: `${150 + days.length * 38}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2 font-medium text-gray-600 border-r border-gray-200 min-w-[150px]">
                    Auxiliar
                  </th>
                  {days.map((d) => (
                    <th key={d} className="px-1 py-2 font-medium text-gray-500 text-center w-9 border-r border-gray-100 last:border-r-0">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auxiliares.map((aux) => (
                  <tr key={aux.id} className="border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-1 font-medium text-gray-800 whitespace-nowrap">
                      {aux.nome}
                    </td>
                    {days.map((d) => {
                      const escala = getEscala(aux.id, d)
                      const turno = escala?.turno as Turno | undefined
                      return (
                        <td
                          key={d}
                          onClick={() => openCell(aux.id, d)}
                          title={turno?.nome ?? escala?.status}
                          className={`w-9 h-8 text-center cursor-pointer border-r border-gray-100 last:border-r-0 transition-colors ${cellClass(escala)}`}
                        >
                          {turno ? turno.nome.charAt(0).toUpperCase() : escala?.status === "bloqueado" ? "✗" : ""}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {auxiliares.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center text-gray-400 py-8">
                      Nenhum auxiliar cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCell
                ? format(parseISO(selectedCell.data), "d 'de' MMMM yyyy", { locale: ptBR })
                : "Editar célula"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Turno</label>
              <Select value={selectedTurnoId} onValueChange={setSelectedTurnoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turno..." />
                </SelectTrigger>
                <SelectContent>
                  {turnos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.horario_inicio.slice(0, 5)}-{t.horario_fim.slice(0, 5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alocado">Alocado</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearEscala}>Limpar</Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveEscala}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
