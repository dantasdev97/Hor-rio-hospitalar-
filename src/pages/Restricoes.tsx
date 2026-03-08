import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, Turno, Restricao } from "@/types"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Restricoes() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [restricoes, setRestricoes] = useState<Restricao[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: t }, { data: r }] = await Promise.all([
      supabase.from("auxiliares").select("*").order("nome"),
      supabase.from("turnos").select("*").order("horario_inicio"),
      supabase.from("restricoes").select("*"),
    ])
    setAuxiliares(a ?? [])
    setTurnos(t ?? [])
    setRestricoes(r ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  function isRestrito(auxiliarId: string, turnoId: string): string | undefined {
    return restricoes.find(
      (r) => r.auxiliar_id === auxiliarId && r.turno_id === turnoId
    )?.id
  }

  async function toggleRestricao(auxiliarId: string, turnoId: string) {
    const existingId = isRestrito(auxiliarId, turnoId)
    if (existingId) {
      await supabase.from("restricoes").delete().eq("id", existingId)
      setRestricoes((prev) => prev.filter((r) => r.id !== existingId))
    } else {
      const { data } = await supabase
        .from("restricoes")
        .insert({ auxiliar_id: auxiliarId, turno_id: turnoId })
        .select()
        .single()
      if (data) setRestricoes((prev) => [...prev, data])
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">A carregar...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Restrições de Horários</h1>
        <p className="text-sm text-gray-500 mt-1">
          Defina quais turnos cada auxiliar não pode realizar
        </p>
      </div>

      {auxiliares.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          Nenhum auxiliar cadastrado. Adicione auxiliares primeiro.
        </div>
      ) : (
        <div className="space-y-4">
          {auxiliares.map((aux) => (
            <Card key={aux.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{aux.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                {turnos.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum turno cadastrado.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {turnos.map((turno) => {
                      const restrito = !!isRestrito(aux.id, turno.id)
                      return (
                        <div
                          key={turno.id}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                            restrito
                              ? "border-red-200 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{turno.nome}</p>
                            <p className="text-xs text-gray-500">
                              {turno.horario_inicio.slice(0, 5)} – {turno.horario_fim.slice(0, 5)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {restrito && (
                              <span className="text-xs text-red-600 font-medium">Bloqueado</span>
                            )}
                            <Switch
                              checked={restrito}
                              onCheckedChange={() => toggleRestricao(aux.id, turno.id)}
                              className={restrito ? "data-[state=checked]:bg-red-500" : ""}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
