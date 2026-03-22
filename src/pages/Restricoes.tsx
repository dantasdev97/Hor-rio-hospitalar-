import { useEffect, useState, useMemo } from "react"
import { Search, X, ShieldX, ShieldCheck, Users } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Turno, Restricao } from "@/types"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// ─── Postos (same as EscalaSemanal) ──────────────────────────────────────────

const POSTOS = [
  { key: "RX_URG",    label: "RX URG",             bg: "#FFFFFF", border: "#D1D5DB" },
  { key: "TAC1",      label: "TAC 1",              bg: "#FFFFFF", border: "#D1D5DB" },
  { key: "TAC2",      label: "TAC 2",              bg: "#FFFFFF", border: "#D1D5DB" },
  { key: "EXAM1",     label: "Exames Comp. (1)",   bg: "#C4B09A", border: "#A08060" },
  { key: "EXAM2",     label: "Exames Comp. (2)",   bg: "#C4B09A", border: "#A08060" },
  { key: "SALA6",     label: "SALA 6 BB",          bg: "#92D050", border: "#5A9A20" },
  { key: "SALA7",     label: "SALA 7 EXT",         bg: "#92D050", border: "#5A9A20" },
  { key: "TRANSPORT", label: "Transportes INT/URG", bg: "#FFBE7B", border: "#D08030" },
] as const

type PostoKey = (typeof POSTOS)[number]["key"]

const TURNO_LETRAS = ["M", "T", "N"] as const
type TurnoLetra = (typeof TURNO_LETRAS)[number]

function turnoParaLetra(t: { nome: string; horario_inicio: string }): TurnoLetra | null {
  const n = t.nome.toUpperCase().trim()
  const h = (t.horario_inicio ?? "").slice(0, 5)

  // MT prefix = mixed (manhã+tarde) → cannot assign to a single cell
  if (n.startsWith("MT")) return null

  // N prefix always means night
  if (n.startsWith("N")) return "N"

  // Classify by horario_inicio (primary truth)
  if (h) {
    if (h >= "20:00") return "N"                         // 20:00–23:59 → night
    if (h > "" && h < "06:00") return "N"               // 00:00–05:59 → overnight/night
    if (h >= "06:00" && h < "14:00") return "M"         // 06:00–13:59 → morning
    if (h >= "14:00" && h < "20:00") return "T"         // 14:00–19:59 → afternoon
  }

  // Fallback to name prefix when horario doesn't resolve
  if (n.startsWith("M")) return "M"
  if (n.startsWith("T")) return "T"

  return null
}

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterMode = "all" | "with" | "without"

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded-md bg-gray-200 animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Generic restriction item ─────────────────────────────────────────────────

interface RestrictItemProps {
  label: string
  sublabel: string
  restrito: boolean
  accentBg?: string
  onToggle: () => void
}

function RestrictItem({ label, sublabel, restrito, accentBg, onToggle }: RestrictItemProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all duration-200 ${
        restrito
          ? "border-red-200 bg-red-50 shadow-sm"
          : "border-gray-200 bg-gray-50 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {accentBg && !restrito && (
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 border border-gray-300"
            style={{ background: accentBg }}
          />
        )}
        {restrito ? (
          <ShieldX className="h-3.5 w-3.5 text-red-500 shrink-0" />
        ) : !accentBg ? (
          <ShieldCheck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        ) : null}
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${restrito ? "text-red-800" : "text-gray-800"}`}>
            {label}
          </p>
          <p className={`text-xs ${restrito ? "text-red-500" : "text-gray-400"}`}>
            {sublabel}
          </p>
        </div>
      </div>
      <Switch
        checked={restrito}
        onCheckedChange={onToggle}
        className={restrito ? "data-[state=checked]:bg-red-500 shrink-0 ml-2" : "shrink-0 ml-2"}
      />
    </div>
  )
}

// ─── Auxiliar card ────────────────────────────────────────────────────────────

interface AuxiliarCardProps {
  aux: Auxiliar
  turnos: Turno[]
  restricoesCount: number
  isRestritoTurno: (turnoId: string) => boolean
  isRestritoPosto: (posto: string) => boolean
  isRestritoCombinado: (postoKey: string, turnoId: string) => boolean
  onToggleTurno: (turnoId: string) => void
  onTogglePosto: (posto: string) => void
  onToggleCombinado: (postoKey: string, turnoId: string) => void
}

function AuxiliarCard({ aux, turnos, restricoesCount, isRestritoTurno, isRestritoPosto, isRestritoCombinado, onToggleTurno, onTogglePosto, onToggleCombinado }: AuxiliarCardProps) {
  // Build a map: turnoLetra → first turnoId that matches
  const turnoIdByLetra = TURNO_LETRAS.reduce((acc, letra) => {
    const found = turnos.find(t => turnoParaLetra(t) === letra)
    if (found) acc[letra] = found.id
    return acc
  }, {} as Partial<Record<TurnoLetra, string>>)
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700 text-sm font-semibold shrink-0">
              {aux.nome.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-base truncate">{aux.nome}</CardTitle>
          </div>
          {restricoesCount > 0 ? (
            <Badge variant="destructive" className="shrink-0 gap-1">
              <ShieldX className="h-3 w-3" />
              {restricoesCount} {restricoesCount === 1 ? "restrição" : "restrições"}
            </Badge>
          ) : (
            <Badge variant="success" className="shrink-0 gap-1">
              <ShieldCheck className="h-3 w-3" />
              Livre
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-5">

        {/* Postos de trabalho */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Postos de trabalho
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {POSTOS.map((posto) => (
              <RestrictItem
                key={posto.key}
                label={posto.label}
                sublabel={isRestritoPosto(posto.key) ? "Restrito" : "Permitido"}
                restrito={isRestritoPosto(posto.key)}
                accentBg={posto.bg === "#FFFFFF" ? undefined : posto.bg}
                onToggle={() => onTogglePosto(posto.key)}
              />
            ))}
          </div>
        </div>

        {/* Turnos */}
        {turnos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Turnos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {turnos.map((turno) => (
                <RestrictItem
                  key={turno.id}
                  label={turno.nome}
                  sublabel={`${turno.horario_inicio.slice(0, 5)} – ${turno.horario_fim.slice(0, 5)}`}
                  restrito={isRestritoTurno(turno.id)}
                  onToggle={() => onToggleTurno(turno.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Matriz Combinada Posto × Turno */}
        {Object.keys(turnoIdByLetra).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Restrições por Posto + Turno
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Bloquear uma combinação específica posto/turno sem bloquear o posto ou turno inteiro.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-3 font-medium text-gray-500 min-w-[120px]">Posto</th>
                    {TURNO_LETRAS.filter(l => turnoIdByLetra[l]).map(letra => (
                      <th key={letra} className="text-center px-2 py-1 font-semibold text-gray-600 w-12">
                        {letra}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {POSTOS.map(posto => (
                    <tr key={posto.key} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 font-medium text-gray-700 text-xs">{posto.label}</td>
                      {TURNO_LETRAS.filter(l => turnoIdByLetra[l]).map(letra => {
                        const tId = turnoIdByLetra[letra]!
                        const restrito = isRestritoCombinado(posto.key, tId)
                        return (
                          <td key={letra} className="text-center px-2 py-1">
                            <button
                              onClick={() => onToggleCombinado(posto.key, tId)}
                              title={restrito
                                ? `Remover bloqueio ${posto.label} — ${letra}`
                                : `Bloquear ${posto.label} — ${letra}`}
                              className={`w-8 h-7 rounded text-xs font-bold transition-all border ${
                                restrito
                                  ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                                  : "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200"
                              }`}
                            >
                              {restrito ? "✕" : "–"}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Stats pill ───────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, colorClass }: {
  icon: React.ElementType
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{value} {label}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Restricoes() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [turnos, setTurnos]         = useState<Turno[]>([])
  const [restricoes, setRestricoes] = useState<Restricao[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [filter, setFilter]         = useState<FilterMode>("all")

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: t }, { data: r }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("turnos").select("*").order("nome"),
      supabase.from("restricoes").select("*"),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setRestricoes(r ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getRestricaoTurnoId(auxiliarId: string, turnoId: string): string | undefined {
    return restricoes.find(r => r.auxiliar_id === auxiliarId && r.turno_id === turnoId && !r.posto)?.id
  }

  function getRestricaoPostoId(auxiliarId: string, posto: string): string | undefined {
    return restricoes.find(r => r.auxiliar_id === auxiliarId && r.posto === posto && !r.turno_id)?.id
  }

  function getRestricaoCount(auxiliarId: string): number {
    return restricoes.filter(r => r.auxiliar_id === auxiliarId).length
  }

  async function toggleRestricaoTurno(auxiliarId: string, turnoId: string) {
    const existingId = getRestricaoTurnoId(auxiliarId, turnoId)
    if (existingId) {
      await supabase.from("restricoes").delete().eq("id", existingId)
      setRestricoes(prev => prev.filter(r => r.id !== existingId))
    } else {
      const { data } = await supabase
        .from("restricoes")
        .insert({ auxiliar_id: auxiliarId, turno_id: turnoId, posto: null })
        .select()
        .single()
      if (data) setRestricoes(prev => [...prev, data])
    }
  }

  async function toggleRestricaoPosto(auxiliarId: string, posto: string) {
    const existingId = getRestricaoPostoId(auxiliarId, posto)
    if (existingId) {
      await supabase.from("restricoes").delete().eq("id", existingId)
      setRestricoes(prev => prev.filter(r => r.id !== existingId))
    } else {
      const { data } = await supabase
        .from("restricoes")
        .insert({ auxiliar_id: auxiliarId, turno_id: null, posto })
        .select()
        .single()
      if (data) setRestricoes(prev => [...prev, data])
    }
  }

  function getRestricaoCombinadaId(auxiliarId: string, posto: string, turnoId: string): string | undefined {
    return restricoes.find(r =>
      r.auxiliar_id === auxiliarId && r.posto === posto && r.turno_id === turnoId
    )?.id
  }

  async function toggleRestricaoCombinada(auxiliarId: string, postoKey: string, turnoId: string) {
    const existingId = getRestricaoCombinadaId(auxiliarId, postoKey, turnoId)
    if (existingId) {
      await supabase.from("restricoes").delete().eq("id", existingId)
      setRestricoes(prev => prev.filter(r => r.id !== existingId))
    } else {
      const { data } = await supabase
        .from("restricoes")
        .insert({ auxiliar_id: auxiliarId, posto: postoKey, turno_id: turnoId })
        .select()
        .single()
      if (data) setRestricoes(prev => [...prev, data])
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filteredAuxiliares = useMemo(() => {
    let list = auxiliares
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.nome.toLowerCase().includes(q))
    }
    if (filter === "with")    list = list.filter(a => getRestricaoCount(a.id) > 0)
    if (filter === "without") list = list.filter(a => getRestricaoCount(a.id) === 0)
    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auxiliares, restricoes, search, filter])

  const totalRestricoes       = restricoes.length
  const auxiliaresComRestricao = auxiliares.filter(a => getRestricaoCount(a.id) > 0).length

  const filterOptions: { value: FilterMode; label: string }[] = [
    { value: "all",     label: "Todos" },
    { value: "with",    label: "Com restrições" },
    { value: "without", label: "Sem restrições" },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Restrições de Horários</h1>
            <p className="text-sm text-gray-500 mt-1">
              Defina quais postos e turnos cada auxiliar não pode realizar
            </p>
          </div>
          {!loading && auxiliares.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <StatPill
                icon={Users}
                label={auxiliaresComRestricao === 1 ? "com restrição" : "com restrições"}
                value={auxiliaresComRestricao}
                colorClass="bg-red-50 text-red-700"
              />
              <StatPill
                icon={ShieldX}
                label={totalRestricoes === 1 ? "bloqueio ativo" : "bloqueios ativos"}
                value={totalRestricoes}
                colorClass="bg-orange-50 text-orange-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      {!loading && auxiliares.length > 0 && (
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              className="pl-9 pr-9"
              placeholder="Pesquisar auxiliar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1 shrink-0">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : auxiliares.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">Nenhum auxiliar cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">Adicione auxiliares primeiro para gerir restrições.</p>
        </div>
      ) : filteredAuxiliares.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">
            {search ? `Nenhum resultado para "${search}"` : "Nenhum auxiliar corresponde ao filtro"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => { setSearch(""); setFilter("all") }}
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAuxiliares.map((aux) => (
            <AuxiliarCard
              key={aux.id}
              aux={aux}
              turnos={turnos}
              restricoesCount={getRestricaoCount(aux.id)}
              isRestritoTurno={(turnoId) => !!getRestricaoTurnoId(aux.id, turnoId)}
              isRestritoPosto={(posto)   => !!getRestricaoPostoId(aux.id, posto)}
              isRestritoCombinado={(postoKey, turnoId) => !!getRestricaoCombinadaId(aux.id, postoKey, turnoId)}
              onToggleTurno={(turnoId)  => toggleRestricaoTurno(aux.id, turnoId)}
              onTogglePosto={(posto)    => toggleRestricaoPosto(aux.id, posto)}
              onToggleCombinado={(postoKey, turnoId) => toggleRestricaoCombinada(aux.id, postoKey, turnoId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
