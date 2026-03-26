import { useEffect, useState, useMemo } from "react"
import { BookOpen, RotateCcw, Trash2, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { TrocaLog } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AuxMap { [id: string]: string }

type FiltroTipo = "todos" | "semanal" | "mensal"
type FiltroEstado = "todos" | "ativo" | "revertido"

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function fmtDia(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })
}

function detalhesTroca(log: TrocaLog): string {
  const s = log.source_turno_info as Record<string, string | null>
  const t = log.target_turno_info as Record<string, string | null>

  if (log.tipo_escala === "semanal") {
    const postoA = s.postoLabel ?? s.posto ?? "?"
    const postoB = t.postoLabel ?? t.posto ?? "?"
    return `${s.turnoLetra ?? "?"} ${postoA} (${fmtDia(log.source_data)}) ↔ ${t.turnoLetra ?? "?"} ${postoB} (${fmtDia(log.target_data)})`
  }

  // mensal
  const nomeA = s.turnoNome ?? "?"
  const nomeB = t.turnoNome ?? "?"
  return `${nomeA} (${fmtDia(log.source_data)}) ↔ ${nomeB} (${fmtDia(log.target_data)})`
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LivroTrocas() {
  const [logs, setLogs] = useState<TrocaLog[]>([])
  const [auxMap, setAuxMap] = useState<AuxMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos")

  // Confirm dialogs
  const [confirmReverter, setConfirmReverter] = useState<TrocaLog | null>(null)
  const [confirmApagar, setConfirmApagar] = useState<TrocaLog | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // ─── Load data ──────────────────────────────────────────────────────────────

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: trocas, error: tErr }, { data: auxs, error: aErr }] = await Promise.all([
        supabase
          .from("trocas_log")
          .select("*")
          .eq("apagado", false)
          .order("created_at", { ascending: false }),
        supabase.from("auxiliares").select("id, nome"),
      ])

      if (tErr) throw tErr
      if (aErr) throw aErr

      setLogs((trocas ?? []) as TrocaLog[])

      const map: AuxMap = {}
      for (const a of auxs ?? []) map[a.id] = a.nome
      setAuxMap(map)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar trocas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filtroTipo !== "todos" && l.tipo_escala !== filtroTipo) return false
      if (filtroEstado === "ativo" && l.revertido) return false
      if (filtroEstado === "revertido" && !l.revertido) return false
      return true
    })
  }, [logs, filtroTipo, filtroEstado])

  // ─── Reverter ───────────────────────────────────────────────────────────────

  async function handleReverter(log: TrocaLog) {
    setActionLoading(true)
    setActionError(null)
    try {
      const s = log.source_turno_info as Record<string, string | null>
      const t = log.target_turno_info as Record<string, string | null>

      if (log.tipo_escala === "mensal") {
        // Swap back turno_id and codigo_especial between the two cells
        // Source cell gets its original turno back (currently has target's turno)
        // Target cell gets its original turno back (currently has source's turno)
        const { error: e1 } = await supabase
          .from("escalas")
          .update({ turno_id: s.turnoId, codigo_especial: s.codigoEspecial ?? null })
          .eq("auxiliar_id", log.source_aux_id)
          .eq("data", log.source_data)

        if (e1) throw e1

        const { error: e2 } = await supabase
          .from("escalas")
          .update({ turno_id: t.turnoId, codigo_especial: t.codigoEspecial ?? null })
          .eq("auxiliar_id", log.target_aux_id)
          .eq("data", log.target_data)

        if (e2) throw e2
      } else {
        // Semanal: delete current assignments and re-insert originals
        // Delete what source currently has (target's original)
        const { error: d1 } = await supabase
          .from("escalas")
          .delete()
          .eq("auxiliar_id", log.source_aux_id)
          .eq("data", log.source_data)
          .eq("turno_letra", t.turnoLetra)
          .eq("posto", t.posto)

        if (d1) throw d1

        // Delete what target currently has (source's original)
        const { error: d2 } = await supabase
          .from("escalas")
          .delete()
          .eq("auxiliar_id", log.target_aux_id)
          .eq("data", log.target_data)
          .eq("turno_letra", s.turnoLetra)
          .eq("posto", s.posto)

        if (d2) throw d2

        // Re-insert source's original assignment
        const { error: i1 } = await supabase
          .from("escalas")
          .insert({
            auxiliar_id: log.source_aux_id,
            data: log.source_data,
            turno_letra: s.turnoLetra,
            posto: s.posto,
          })

        if (i1) throw i1

        // Re-insert target's original assignment
        const { error: i2 } = await supabase
          .from("escalas")
          .insert({
            auxiliar_id: log.target_aux_id,
            data: log.target_data,
            turno_letra: t.turnoLetra,
            posto: t.posto,
          })

        if (i2) throw i2
      }

      // Mark as reverted
      const { error: markErr } = await supabase
        .from("trocas_log")
        .update({ revertido: true, revertido_at: new Date().toISOString() })
        .eq("id", log.id)

      if (markErr) throw markErr

      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, revertido: true, revertido_at: new Date().toISOString() } : l))
      setConfirmReverter(null)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Erro ao reverter troca.")
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Apagar ─────────────────────────────────────────────────────────────────

  async function handleApagar(log: TrocaLog) {
    setActionLoading(true)
    setActionError(null)
    try {
      const { error } = await supabase
        .from("trocas_log")
        .update({ apagado: true })
        .eq("id", log.id)

      if (error) throw error

      setLogs(prev => prev.filter(l => l.id !== log.id))
      setConfirmApagar(null)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Erro ao apagar registo.")
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Aux name helper ────────────────────────────────────────────────────────

  function auxNome(id: string) {
    const full = auxMap[id]
    if (!full) return "—"
    const parts = full.split(" ")
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : full
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Livro de Trocas</h1>
          <p className="text-sm text-gray-500">Histórico de todas as trocas de turno realizadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FiltroEstado)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="revertido">Revertido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm">A carregar trocas…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BookOpen className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">Nenhuma troca encontrada.</p>
        </div>
      ) : (
        /* Table */
        <div className="rounded-lg border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Auxiliar A</TableHead>
                <TableHead>Auxiliar B</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-gray-600">
                    {fmtData(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        log.tipo_escala === "semanal"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      {log.tipo_escala === "semanal" ? "Semanal" : "Mensal"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-gray-800 text-sm">
                    {auxNome(log.source_aux_id)}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800 text-sm">
                    {auxNome(log.target_aux_id)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 max-w-[260px] truncate" title={detalhesTroca(log)}>
                    {detalhesTroca(log)}
                  </TableCell>
                  <TableCell>
                    {log.revertido ? (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Revertido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!log.revertido && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                          title="Reverter troca"
                          onClick={() => { setActionError(null); setConfirmReverter(log) }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        title="Apagar registo"
                        onClick={() => { setActionError(null); setConfirmApagar(log) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm Reverter Dialog */}
      <Dialog open={!!confirmReverter} onOpenChange={(open) => { if (!open) setConfirmReverter(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reverter Troca
            </DialogTitle>
          </DialogHeader>
          {confirmReverter && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Tem a certeza que deseja reverter esta troca?
              </p>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-1">
                <div><strong>{auxNome(confirmReverter.source_aux_id)}</strong> ↔ <strong>{auxNome(confirmReverter.target_aux_id)}</strong></div>
                <div className="text-gray-500">{detalhesTroca(confirmReverter)}</div>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmReverter(null)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => handleReverter(confirmReverter)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                  Reverter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Apagar Dialog */}
      <Dialog open={!!confirmApagar} onOpenChange={(open) => { if (!open) setConfirmApagar(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Apagar Registo
            </DialogTitle>
          </DialogHeader>
          {confirmApagar && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Tem a certeza que deseja apagar este registo? O registo será removido da lista mas a troca mantém-se.
              </p>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-1">
                <div><strong>{auxNome(confirmApagar.source_aux_id)}</strong> ↔ <strong>{auxNome(confirmApagar.target_aux_id)}</strong></div>
                <div className="text-gray-500">{detalhesTroca(confirmApagar)}</div>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmApagar(null)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApagar(confirmApagar)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Apagar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
