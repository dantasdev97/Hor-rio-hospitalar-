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

const POSTOS_OPTIONS = [
  { key: "RX_URG",    label: "RX URG" },
  { key: "TAC1",      label: "TAC 1" },
  { key: "TAC2",      label: "TAC 2" },
  { key: "EXAM1",     label: "Exames Comp. (1)" },
  { key: "EXAM2",     label: "Exames Comp. (2)" },
  { key: "SALA6",     label: "SALA 6 BB" },
  { key: "SALA7",     label: "SALA 7 EXT" },
  { key: "TRANSPORT", label: "Transportes INT/URG" },
] as const

// Classifica um turno na sua célula da escala semanal: M / T / N / MT / null
function turnoParaLetra(t: { nome: string; horario_inicio: string }): string | null {
  const n = t.nome.toUpperCase().trim()
  const h = (t.horario_inicio ?? "").slice(0, 5)
  if (n.startsWith("MT")) return "MT"
  if (n.startsWith("N")) return "N"
  if (h) {
    if (h >= "20:00") return "N"
    if (h > "" && h < "06:00") return "N"
    if (h >= "06:00" && h < "14:00") return "M"
    if (h >= "14:00" && h < "20:00") return "T"
  }
  if (n.startsWith("M")) return "M"
  if (n.startsWith("T")) return "T"
  return null
}

const LETRA_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  M:  { bg: "#C6EFCE", color: "#276221", label: "Manhã"  },
  T:  { bg: "#FFEB9C", color: "#9C6500", label: "Tarde"  },
  N:  { bg: "#BDD7EE", color: "#1F497D", label: "Noite"  },
  MT: { bg: "#BAE6FD", color: "#0369A1", label: "Misto"  },
}

// Paleta de cores que corresponde às cores do Excel da escala
const COLOR_PALETTE = [
  { hex: "#FEF08A", label: "Amarelo – Manhã (M)" },
  { hex: "#FECDD3", label: "Rosa – Tarde (T)" },
  { hex: "#C7D2FE", label: "Azul – Noite (N)" },
  { hex: "#BAE6FD", label: "Ciano – Misto (MT)" },
  { hex: "#D9F99D", label: "Verde-lima – RX/TAC" },
  { hex: "#86EFAC", label: "Verde – Feriado" },
  { hex: "#FCA5A5", label: "Vermelho claro" },
  { hex: "#DDD6FE", label: "Lilás" },
  { hex: "#D1D5DB", label: "Cinza – Descanso" },
  { hex: "#A5F3FC", label: "Ciano claro" },
  { hex: "#FDBA74", label: "Laranja" },
]

const schema = z.object({
  nome: z.string().min(1, "Código é obrigatório"),
  horario_inicio: z.string().min(1, "Horário de início é obrigatório"),
  horario_fim: z.string().min(1, "Horário de fim é obrigatório"),
})
type FormData = z.infer<typeof schema>

export default function Turnos() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Turno | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedPostos, setSelectedPostos] = useState<string[]>([])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function fetchTurnos() {
    setLoading(true)
    const { data } = await supabase.from("turnos").select("*").order("nome")
    setTurnos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTurnos() }, [])

  function openNew() {
    setEditing(null)
    setSelectedColor("")
    setSelectedPostos([])
    reset({ nome: "", horario_inicio: "", horario_fim: "" })
    setDialogOpen(true)
  }

  function openEdit(turno: Turno) {
    setEditing(turno)
    setSelectedColor(turno.cor ?? "")
    setSelectedPostos(turno.postos ?? [])
    reset({
      nome: turno.nome,
      horario_inicio: turno.horario_inicio,
      horario_fim: turno.horario_fim,
    })
    setDialogOpen(true)
  }

  function togglePosto(key: string) {
    setSelectedPostos(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
  }

  async function onSubmit(data: FormData) {
    const payload = {
      nome: data.nome,
      horario_inicio: data.horario_inicio,
      horario_fim: data.horario_fim,
      cor: selectedColor || null,
      postos: selectedPostos,
    }
    if (editing) {
      await supabase.from("turnos").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("turnos").insert(payload)
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
          <p className="text-sm text-gray-500 mt-1">Gestão dos turnos e códigos de trabalho</p>
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
                <TableHead>Código</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Célula Semanal</TableHead>
                <TableHead>Postos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turnos.map((turno) => (
                <TableRow key={turno.id}>
                  <TableCell>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded font-bold text-sm border border-gray-200"
                      style={{ background: turno.cor ?? "#E5E7EB", color: "#111827", minWidth: 52, justifyContent: "center" }}
                    >
                      {turno.nome}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {turno.horario_inicio.slice(0, 5)} – {turno.horario_fim.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const letra = turnoParaLetra(turno)
                      if (!letra) return <span className="text-gray-400 text-xs italic">—</span>
                      const style = LETRA_STYLE[letra]
                      return (
                        <span
                          title={style.label}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: style.bg, color: style.color,
                            fontWeight: 700, fontSize: 11, padding: "2px 8px",
                            borderRadius: 6, border: `1px solid ${style.color}33`,
                          }}
                        >
                          {letra} <span style={{ fontWeight: 400, opacity: 0.75 }}>({style.label})</span>
                        </span>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {(turno.postos ?? []).length === 0
                      ? <span className="text-gray-400 italic">—</span>
                      : (turno.postos ?? []).map(pk => POSTOS_OPTIONS.find(p => p.key === pk)?.label ?? pk).join(", ")
                    }
                  </TableCell>
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
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turno" : "Adicionar Turno"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Código do Turno *</Label>
              <Input id="nome" {...register("nome")} placeholder="Ex: M7, T21, N5, TAC/ECO" />
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
            <div className="space-y-2">
              <Label>Cor na escala</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setSelectedColor(c.hex)}
                    className="w-8 h-8 rounded-md transition-all"
                    style={{
                      background: c.hex,
                      border: `2px solid ${selectedColor === c.hex ? "#111827" : "#D1D5DB"}`,
                      transform: selectedColor === c.hex ? "scale(1.2)" : "scale(1)",
                      boxShadow: selectedColor === c.hex ? "0 0 0 2px white, 0 0 0 4px #111827" : "none",
                    }}
                  />
                ))}
                <button
                  type="button"
                  title="Sem cor"
                  onClick={() => setSelectedColor("")}
                  className="w-8 h-8 rounded-md border-2 flex items-center justify-center text-gray-400 text-xs transition-all"
                  style={{ borderColor: !selectedColor ? "#111827" : "#D1D5DB" }}
                >
                  ✕
                </button>
              </div>
              {selectedColor && (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded font-bold text-sm border border-gray-200"
                    style={{ background: selectedColor, color: "#111827" }}
                  >
                    Pré-visualização do código
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Postos associados</Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {POSTOS_OPTIONS.map(p => (
                  <label key={p.key} className="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPostos.includes(p.key)}
                      onChange={() => togglePosto(p.key)}
                      className="rounded border-gray-300"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Pessoa com este turno na escala mensal aparece automaticamente neste(s) posto(s) na semanal.
              </p>
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