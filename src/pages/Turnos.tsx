import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Turno } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  horario_inicio: z.string().min(1, "Horário de início é obrigatório"),
  horario_fim: z.string().min(1, "Horário de fim é obrigatório"),
})
type FormData = z.infer<typeof schema>

export default function Turnos() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Turno | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function fetchTurnos() {
    setLoading(true)
    const { data } = await supabase.from("turnos").select("*").order("horario_inicio")
    setTurnos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTurnos() }, [])

  function openNew() {
    setEditing(null)
    reset({ nome: "", horario_inicio: "", horario_fim: "" })
    setDialogOpen(true)
  }

  function openEdit(turno: Turno) {
    setEditing(turno)
    reset({
      nome: turno.nome,
      horario_inicio: turno.horario_inicio,
      horario_fim: turno.horario_fim,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    if (editing) {
      await supabase.from("turnos").update(data).eq("id", editing.id)
    } else {
      await supabase.from("turnos").insert(data)
    }
    setDialogOpen(false)
    fetchTurnos()
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este turno?")) return
    await supabase.from("turnos").delete().eq("id", id)
    fetchTurnos()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turnos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão dos turnos de trabalho</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Adicionar Turno
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : turnos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhum turno cadastrado. Clique em "Adicionar Turno" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Horário Início</TableHead>
                <TableHead>Horário Fim</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turnos.map((turno) => (
                <TableRow key={turno.id}>
                  <TableCell className="font-medium">{turno.nome}</TableCell>
                  <TableCell>{turno.horario_inicio.slice(0, 5)}</TableCell>
                  <TableCell>{turno.horario_fim.slice(0, 5)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(turno)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(turno.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turno" : "Adicionar Turno"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do Turno *</Label>
              <Input id="nome" {...register("nome")} placeholder="Ex: Manhã, Tarde, Noite" />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="horario_inicio">Início *</Label>
                <Input id="horario_inicio" type="time" {...register("horario_inicio")} />
                {errors.horario_inicio && <p className="text-xs text-red-500">{errors.horario_inicio.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="horario_fim">Fim *</Label>
                <Input id="horario_fim" type="time" {...register("horario_fim")} />
                {errors.horario_fim && <p className="text-xs text-red-500">{errors.horario_fim.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : editing ? "Guardar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
