import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Turno } from "@/types"

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

type PostoKey = typeof POSTOS_OPTIONS[number]["key"]

export default function VincularTurnoPosto() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("turnos").select("*").order("nome")
    setTurnos((data ?? []).map(t => ({ ...t, postos: t.postos ?? [] })))
    setLoading(false)
  }, [])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  async function togglePosto(turno: Turno, postoKey: PostoKey) {
    const current = turno.postos ?? []
    const next = current.includes(postoKey)
      ? current.filter(p => p !== postoKey)
      : [...current, postoKey]

    // Optimistic update
    setTurnos(prev => prev.map(t => t.id === turno.id ? { ...t, postos: next } : t))

    setSaving(turno.id)
    await supabase.from("turnos").update({ postos: next }).eq("id", turno.id)
    setSaving(null)
    setSaved(turno.id)
    setTimeout(() => setSaved(null), 1200)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Turnos → Postos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione para cada turno os postos de trabalho que cobre.
          A escala semanal será preenchida automaticamente com base nesta configuração.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">A carregar...</div>
      ) : turnos.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          Nenhum turno encontrado. Crie turnos primeiro na página "Turnos".
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 min-w-[120px] sticky left-0 bg-gray-50 border-r border-gray-200">
                  Turno
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 min-w-[90px]">
                  Horário
                </th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[90px]">
                  Célula
                </th>
                {POSTOS_OPTIONS.map(p => (
                  <th key={p.key} className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[90px]">
                    {p.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center min-w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno, idx) => {
                const postos = turno.postos ?? []
                const isSaving = saving === turno.id
                const isSaved = saved === turno.id
                return (
                  <tr
                    key={turno.id}
                    className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    <td className="px-4 py-3 sticky left-0 border-r border-gray-100 bg-inherit">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded font-bold text-sm border border-gray-200"
                        style={{ background: turno.cor ?? "#E5E7EB", color: "#111827" }}
                      >
                        {turno.nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {turno.horario_inicio.slice(0, 5)} – {turno.horario_fim.slice(0, 5)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(() => {
                        const letra = turnoParaLetra(turno)
                        if (!letra) return <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>
                        const s = LETRA_STYLE[letra]
                        return (
                          <span title={s.label} style={{
                            display: "inline-block", background: s.bg, color: s.color,
                            fontWeight: 700, fontSize: 11, padding: "2px 8px",
                            borderRadius: 6, border: `1px solid ${s.color}33`,
                          }}>
                            {letra}
                          </span>
                        )
                      })()}
                    </td>
                    {POSTOS_OPTIONS.map(p => (
                      <td key={p.key} className="text-center px-3 py-3">
                        <input
                          type="checkbox"
                          checked={postos.includes(p.key)}
                          onChange={() => togglePosto(turno, p.key)}
                          disabled={isSaving}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 cursor-pointer disabled:opacity-50"
                          title={`${turno.nome} → ${p.label}`}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center w-12">
                      {isSaving && (
                        <span className="text-xs text-gray-400 animate-pulse">...</span>
                      )}
                      {isSaved && !isSaving && (
                        <span className="text-xs text-green-600 font-medium">✓</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        As alterações são guardadas automaticamente em cada seleção.
      </p>
    </div>
  )
}
