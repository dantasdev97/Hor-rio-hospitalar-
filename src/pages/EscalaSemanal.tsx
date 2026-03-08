import { useEffect, useState } from "react"
import { format, startOfWeek, addDays, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Turno, Escala } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

export default function EscalaSemanal() {
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ auxiliarId: string; data: string } | null>(null)
  const [selectedTurnoId, setSelectedTurnoId] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"disponivel" | "alocado" | "bloqueado">("alocado")

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekDays = DIAS.map((_, i) => addDays(weekStart, i))

  async function fetchAll() {
    setLoading(true)
    const startDate = format(weekDays[0], "yyyy-MM-dd")
    const endDate = format(weekDays[6], "yyyy-MM-dd")
    const [{ data: a }, { data: t }, { data: e }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("turnos").select("*").order("horario_inicio"),
      supabase.from("escalas").select("*, turno:turnos(*)").eq("tipo_escala", "semanal").gte("data", startDate).lte("data", endDate),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setEscalas(e ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [weekStart.toISOString()])

  function getEscala(auxiliarId: string, data: string) {
    return escalas.find((e) => e.auxiliar_id === auxiliarId && e.data === data)
  }

  function openCell(auxiliarId: string, data: string) {
    const existing = getEscala(auxiliarId, data)
    setSelectedCell({ auxiliarId, data })
    setSelectedTurnoId(existing?.turno_id ?? "")
    setSelectedStatus(existing?.status ?? "alocado")
    setDialogOpen(true)
  }

  async function saveEscala() {
    if (!selectedCell) return
    const existing = getEscala(selectedCell.auxiliarId, selectedCell.data)
    const payload = {
      auxiliar_id: selectedCell.auxiliarId,
      data: selectedCell.data,
      tipo_escala: "semanal" as const,
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
    const existing = getEscala(selectedCell.auxiliarId, selectedCell.data)
    if (existing) {
      await supabase.from("escalas").delete().eq("id", existing.id)
    }
    setDialogOpen(false)
    fetchAll()
  }

  function prevWeek() { setReferenceDate((d) => addDays(d, -7)) }
  function nextWeek() { setReferenceDate((d) => addDays(d, 7)) }

  const statusColors: Record<string, string> = {
    disponivel: "bg-white text-gray-500",
    alocado: "bg-primary-50 text-primary-700 font-medium",
    bloqueado: "bg-red-50 text-red-600",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horário Semanal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Semana de {format(weekDays[0], "d MMM", { locale: ptBR })} a {format(weekDays[6], "d MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())}>
            Esta semana
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">A carregar...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-3 font-medium text-gray-600 border-r border-gray-200 min-w-[150px]">
                    Auxiliar
                  </th>
                  {weekDays.map((day, i) => (
                    <th key={i} className="px-3 py-3 font-medium text-gray-600 text-center min-w-[100px]">
                      <div>{DIAS[i]}</div>
                      <div className="text-xs font-normal text-gray-400">{format(day, "d/M")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auxiliares.map((aux) => (
                  <tr key={aux.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-4 py-2 font-medium text-gray-800">
                      {aux.nome}
                    </td>
                    {weekDays.map((day, i) => {
                      const dataStr = format(day, "yyyy-MM-dd")
                      const escala = getEscala(aux.id, dataStr)
                      return (
                        <td
                          key={i}
                          onClick={() => openCell(aux.id, dataStr)}
                          className={`px-2 py-2 text-center cursor-pointer border-r border-gray-100 last:border-r-0 transition-colors hover:bg-primary-50 ${escala ? statusColors[escala.status] : "text-gray-300"}`}
                        >
                          {escala?.turno
                            ? (escala.turno as Turno).nome
                            : escala?.status === "bloqueado"
                            ? "✗"
                            : "–"}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {auxiliares.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-400 py-8">
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
                ? `${format(parseISO(selectedCell.data), "EEEE, d 'de' MMMM", { locale: ptBR })}`
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
