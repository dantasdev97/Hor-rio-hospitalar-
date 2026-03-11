import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Doutor, Turno, DoutorTurno } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  numero_mecanografico: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Doutores() {
  const [doutores, setDoutores] = useState<Doutor[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [doutorTurnos, setDoutorTurnos] = useState<DoutorTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [turnosDialogOpen, setTurnosDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doutor | null>(null)
  const [selectedDoutor, setSelectedDoutor] = useState<Doutor | null>(null)
  const [selectedTurnoId, setSelectedTurnoId] = useState("")

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function fetchAll() {
    setLoading(true)
    const [{ data: d }, { data: t }, { data: dt }] = await Promise.all([
      supabase.from("doutores").select("*").order("nome"),
      supabase.from("turnos").select("*").order("horario_inicio"),
      supabase.from("doutor_turnos").select("*, turno:turnos(*)"),
    ])
    setDoutores(d ?? [])
    setTurnos(t ?? [])
    setDoutorTurnos(dt ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  function getTurnosForDoutor(doutorId: string) {
    return doutorTurnos
      .filter((dt) => dt.doutor_id === doutorId)
      .map((dt) => dt.turno as Turno)
      .filter(Boolean)
  }

  function openNew() {
    setEditing(null)
    reset({ nome: "", numero_mecanografico: "" })
    setDialogOpen(true)
  }

  function openEdit(doutor: Doutor) {
    setEditing(doutor)
    reset({ nome: doutor.nome, numero_mecanografico: doutor.numero_mecanografico ?? "" })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      nome: data.nome,
      numero_mecanografico: data.numero_mecanografico || null,
    }
    if (editing) {
      await supabase.from("doutores").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("doutores").insert(payload)
    }
    setDialogOpen(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este doutor?")) return
    await supabase.from("doutores").delete().eq("id", id)
    fetchAll()
  }

  function openTurnosDialog(doutor: Doutor) {
    setSelectedDoutor(doutor)
    setSelectedTurnoId("")
    setTurnosDialogOpen(true)
  }

  async function addTurnoToDoutor() {
    if (!selectedDoutor || !selectedTurnoId) return
    const existing = doutorTurnos.find(
      (dt) => dt.doutor_id === selectedDoutor.id && dt.turno_id === selectedTurnoId
    )
    if (existing) return
    await supabase.from("doutor_turnos").insert({
      doutor_id: selectedDoutor.id,
      turno_id: selectedTurnoId,
    })
    setSelectedTurnoId("")
    fetchAll()
  }

  async function removeTurnoFromDoutor(doutorTurnoId: string) {
    await supabase.from("doutor_turnos").delete().eq("id", doutorTurnoId)
    fetchAll()
  }

  const selectedDoutorTurnos = selectedDoutor
    ? doutorTurnos.filter((dt) => dt.doutor_id === selectedDoutor.id)
    : []

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doutores</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de médicos e turnos atribuídos</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Adicionar Doutor
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : doutores.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhum doutor cadastrado. Clique em "Adicionar Doutor" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nº Mecanográfico</TableHead>
                <TableHead>Turnos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doutores.map((doutor) => {
                const turnosList = getTurnosForDoutor(doutor.id)
                return (
                  <TableRow key={doutor.id}>
                    <TableCell className="font-medium">{doutor.nome}</TableCell>
                    <TableCell className="text-gray-500">{doutor.numero_mecanografico ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {turnosList.length === 0 ? (
                          <span className="text-gray-400 text-sm">Sem turnos</span>
                        ) : (
                          turnosList.map((t) => (
                            <Badge key={t.id} variant="secondary">
                              {t.nome}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openTurnosDialog(doutor)}>
                          Turnos
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(doutor)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(doutor.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog Doutor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Doutor" : "Adicionar Doutor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome")} placeholder="Nome completo" />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero_mecanografico">Nº Mecanográfico</Label>
              <Input id="numero_mecanografico" {...register("numero_mecanografico")} placeholder="Ex: 12345" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : editing ? "Guardar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Turnos */}
      <Dialog open={turnosDialogOpen} onOpenChange={setTurnosDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Turnos de {selectedDoutor?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedTurnoId} onValueChange={setSelectedTurnoId}>
                <SelectTrigger className="flex-1">
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
              <Button onClick={addTurnoToDoutor} disabled={!selectedTurnoId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedDoutorTurnos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum turno atribuído</p>
            ) : (
              <ul className="space-y-2">
                {selectedDoutorTurnos.map((dt) => {
                  const t = dt.turno as Turno
                  return (
                    <li key={dt.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <span className="text-sm font-medium">
                        {t?.nome} <span className="text-gray-400 font-normal">({t?.horario_inicio?.slice(0, 5)}-{t?.horario_fim?.slice(0, 5)})</span>
                      </span>
                      <Button size="sm" variant="destructive" onClick={() => removeTurnoFromDoutor(dt.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTurnosDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
