import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar } from "@/types"
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

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")),
  numero_mecanografico: z.string().optional(),
  contribuinte: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Auxiliares() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Auxiliar | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function fetchAuxiliares() {
    setLoading(true)
    const { data } = await supabase.from("auxiliares").select("*").order("nome")
    setAuxiliares(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAuxiliares() }, [])

  function openNew() {
    setEditing(null)
    reset({ nome: "", email: "", numero_mecanografico: "", contribuinte: "" })
    setDialogOpen(true)
  }

  function openEdit(aux: Auxiliar) {
    setEditing(aux)
    reset({
      nome: aux.nome,
      email: aux.email ?? "",
      numero_mecanografico: aux.numero_mecanografico ?? "",
      contribuinte: aux.contribuinte ?? "",
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      nome: data.nome,
      email: data.email || null,
      numero_mecanografico: data.numero_mecanografico || null,
      contribuinte: data.contribuinte || null,
    }

    if (editing) {
      await supabase.from("auxiliares").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("auxiliares").insert(payload)
    }

    setDialogOpen(false)
    fetchAuxiliares()
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este auxiliar?")) return
    await supabase.from("auxiliares").delete().eq("id", id)
    fetchAuxiliares()
  }

  async function toggleDisponivel(aux: Auxiliar) {
    await supabase.from("auxiliares").update({ disponivel: !aux.disponivel }).eq("id", aux.id)
    fetchAuxiliares()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auxiliares</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de auxiliares de saúde</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Adicionar Auxiliar
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : auxiliares.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhum auxiliar cadastrado. Clique em "Adicionar Auxiliar" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nº Mecanográfico</TableHead>
                <TableHead>Contribuinte</TableHead>
                <TableHead>Disponível</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auxiliares.map((aux) => (
                <TableRow key={aux.id}>
                  <TableCell className="font-medium">{aux.nome}</TableCell>
                  <TableCell className="text-gray-500">{aux.email ?? "-"}</TableCell>
                  <TableCell className="text-gray-500">{aux.numero_mecanografico ?? "-"}</TableCell>
                  <TableCell className="text-gray-500">{aux.contribuinte ?? "-"}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleDisponivel(aux)}>
                      <Badge variant={aux.disponivel ? "success" : "destructive"}>
                        {aux.disponivel ? "Disponível" : "Indisponível"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(aux)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(aux.id)}>
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
            <DialogTitle>{editing ? "Editar Auxiliar" : "Adicionar Auxiliar"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome")} placeholder="Nome completo" />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@hospital.pt" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero_mecanografico">Nº Mecanográfico</Label>
              <Input id="numero_mecanografico" {...register("numero_mecanografico")} placeholder="Ex: 12345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contribuinte">NIF / Contribuinte</Label>
              <Input id="contribuinte" {...register("contribuinte")} placeholder="Ex: 123456789" />
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
