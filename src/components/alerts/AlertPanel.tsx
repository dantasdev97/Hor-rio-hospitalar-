import { useState, useEffect, useRef } from "react"
import { X, Eye, Check, ChevronDown } from "lucide-react"
import type { AlertaUnificado, CategoriaAlerta, CellRef } from "./alertTypes"
import { SECTION_CONFIG } from "./alertTypes"

// ─── Props ───────────────────────────────────────────────────────────────────
interface AlertPanelProps {
  open: boolean
  onClose: () => void
  alertas: AlertaUnificado[]
  titulo: string
  subtitulo: string
  onEyeClick: (cellRef: CellRef, isUrg: boolean) => void
  onActionClick?: (acao: { label: string; auxId: string; dia: number }) => void
  /** Opções de filtro por dia — se omitido, não mostra filtro de dias */
  dayFilters?: { value: string; label: string }[]
}

// ─── Estilos por severidade ──────────────────────────────────────────────────
const SEV_STYLE = {
  vermelho: { border: "#FECACA", bg: "#FEF2F2", leftBar: "#EF4444", titleColor: "#991B1B", icon: "🚨" },
  amarelo:  { border: "#FDE68A", bg: "#FFFBEB", leftBar: "#F59E0B", titleColor: "#92400E", icon: "⚠️" },
  info:     { border: "#BFDBFE", bg: "#EFF6FF", leftBar: "#3B82F6", titleColor: "#1E40AF", icon: "ℹ️" },
}

type FiltroTipo = "todos" | "vermelho" | "amarelo" | "info"

// ─── Component ───────────────────────────────────────────────────────────────
export default function AlertPanel({
  open, onClose, alertas, titulo, subtitulo, onEyeClick, onActionClick, dayFilters,
}: AlertPanelProps) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos")
  const [filtroDia, setFiltroDia] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<Set<CategoriaAlerta>>(new Set())
  const prevIdsRef = useRef<string>("")

  // Reset dismissed quando alertas mudam
  useEffect(() => {
    const ids = alertas.map(a => a.id).sort().join("|")
    if (ids !== prevIdsRef.current) {
      prevIdsRef.current = ids
      setDismissed(new Set())
      setResolved(new Set())
    }
  }, [alertas])

  if (!open) return null

  // Contadores
  const vermelhos = alertas.filter(a => a.severidade === "vermelho")
  const amarelos  = alertas.filter(a => a.severidade === "amarelo")
  const infos     = alertas.filter(a => a.severidade === "info")

  // Filtrar por tipo
  const byTipo = filtroTipo === "todos" ? alertas
    : alertas.filter(a => a.severidade === filtroTipo)

  // Filtrar por dia
  const byDia = filtroDia
    ? byTipo.filter(a => a.cellRef?.data === filtroDia || a.mensagem.includes(filtroDia))
    : byTipo

  // Remover dismissed
  const displayed = byDia.filter(a => !dismissed.has(a.id))

  // Agrupar por categoria
  const byCat = (cat: CategoriaAlerta) => displayed.filter(a => a.categoria === cat)

  function dismiss(id: string) {
    setDismissed(prev => new Set(prev).add(id))
  }

  function resolve(id: string) {
    setResolved(prev => new Set(prev).add(id))
  }

  function toggleSection(cat: CategoriaAlerta) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const tipoBtnStyle = (active: boolean, color: string) => ({
    padding: "5px 11px", borderRadius: 20, border: "none", cursor: "pointer" as const,
    fontSize: 12, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap" as const,
    background: active ? color : "#F3F4F6",
    color: active ? "#fff" : "#6B7280",
  })

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 59, animation: "fadeIn 0.2s ease" }}
        onClick={onClose}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100vw",
        background: "#fff", boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", zIndex: 60,
        display: "flex", flexDirection: "column",
        animation: "slideLeftIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg,#1A2E44 0%,#1e3a5f 100%)",
          padding: "18px 20px 16px", flex: "0 0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 17, color: "#fff", margin: "0 0 2px" }}>{titulo}</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0 }}>{subtitulo}</p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer",
                padding: 6, borderRadius: 8, color: "#fff", lineHeight: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { count: vermelhos.length, label: "Urgentes",  bg: "#EF4444" },
              { count: amarelos.length,  label: "Avisos",    bg: "#F59E0B" },
              { count: infos.length,     label: "Info",      bg: "#3B82F6" },
            ].map(({ count, label, bg }) => (
              <div key={label} style={{
                flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 8,
                padding: "6px 10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? bg : "rgba(255,255,255,0.3)", lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #F0F0F0", flex: "0 0 auto", background: "#FAFAFA" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: dayFilters ? 8 : 0, overflowX: "auto", paddingBottom: 2 }}>
            <button onClick={() => setFiltroTipo("todos")}    style={tipoBtnStyle(filtroTipo === "todos",    "#374151")}>Todos {alertas.length > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({alertas.length})</span>}</button>
            <button onClick={() => setFiltroTipo("vermelho")} style={tipoBtnStyle(filtroTipo === "vermelho", "#DC2626")}>Urgentes {vermelhos.length > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({vermelhos.length})</span>}</button>
            <button onClick={() => setFiltroTipo("amarelo")}  style={tipoBtnStyle(filtroTipo === "amarelo",  "#D97706")}>Avisos {amarelos.length > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({amarelos.length})</span>}</button>
            <button onClick={() => setFiltroTipo("info")}     style={tipoBtnStyle(filtroTipo === "info",     "#2563EB")}>Info {infos.length > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({infos.length})</span>}</button>
          </div>
          {dayFilters && (
            <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
              <button
                onClick={() => setFiltroDia(null)}
                style={{
                  padding: "3px 10px", borderRadius: 12, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                  background: filtroDia === null ? "#1A2E44" : "#F3F4F6",
                  color: filtroDia === null ? "#fff" : "#6B7280",
                }}
              >
                Todos os dias
              </button>
              {dayFilters.map(df => (
                <button
                  key={df.value}
                  onClick={() => setFiltroDia(filtroDia === df.value ? null : df.value)}
                  style={{
                    padding: "3px 9px", borderRadius: 12, border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                    background: filtroDia === df.value ? "#1A2E44" : "#F3F4F6",
                    color: filtroDia === df.value ? "#fff" : "#6B7280",
                  }}
                >
                  {df.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "14px 16px" }}>
          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#374151" }}>
                {alertas.length === 0 ? "Escala completa!" : "Sem alertas nesta seleção"}
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                {alertas.length === 0 ? "Todos os postos estão cobertos." : "Tente mudar os filtros acima."}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SECTION_CONFIG.map(sec => {
                const items = byCat(sec.key)
                if (items.length === 0) return null
                const collapsed = collapsedSections.has(sec.key)
                return (
                  <div key={sec.key}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(sec.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, width: "100%",
                        background: "none", border: "none", cursor: "pointer",
                        padding: "6px 0", marginBottom: collapsed ? 0 : 6,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{sec.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: sec.titleColor, flex: 1, textAlign: "left" }}>
                        {sec.label}
                      </span>
                      <span style={{
                        background: sec.borderColor, color: "#fff", fontSize: 10, fontWeight: 700,
                        borderRadius: 10, padding: "1px 7px", minWidth: 18, textAlign: "center",
                      }}>
                        {items.length}
                      </span>
                      <ChevronDown size={14} style={{
                        color: "#9CA3AF", transition: "transform 0.2s",
                        transform: collapsed ? "rotate(-90deg)" : "rotate(0)",
                      }} />
                    </button>
                    {/* Items */}
                    {!collapsed && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(a => {
                          const s = SEV_STYLE[a.severidade]
                          const isResolved = resolved.has(a.id)
                          return (
                            <div key={a.id} style={{
                              borderRadius: 10, border: `1px solid ${s.border}`,
                              borderLeft: `3px solid ${s.leftBar}`,
                              background: isResolved ? "#F0FDF4" : s.bg,
                              padding: "10px 12px",
                              opacity: isResolved ? 0.6 : 1,
                              transition: "opacity 0.3s",
                            }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <span style={{ fontSize: 14, lineHeight: "18px", flexShrink: 0 }}>{s.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontWeight: 600, fontSize: 12, color: isResolved ? "#16A34A" : s.titleColor,
                                    lineHeight: 1.4, textDecoration: isResolved ? "line-through" : "none",
                                  }}>
                                    {a.mensagem}
                                  </div>
                                  {a.detalhe && (
                                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>↳ {a.detalhe}</div>
                                  )}
                                  {/* Acção */}
                                  {a.acao && onActionClick && !isResolved && (
                                    <button
                                      onClick={() => onActionClick(a.acao!)}
                                      style={{
                                        marginTop: 6, padding: "3px 10px", borderRadius: 6,
                                        border: "1px solid #DBEAFE", background: "#EFF6FF",
                                        color: "#1D4ED8", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                      }}
                                    >
                                      {a.acao.label}
                                    </button>
                                  )}
                                </div>
                                {/* Action icons */}
                                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                  {/* Eye — localizar célula */}
                                  {a.cellRef && (
                                    <button
                                      onClick={() => onEyeClick(a.cellRef!, a.isUrg)}
                                      title="Localizar na escala"
                                      style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        padding: 4, borderRadius: 6, color: "#6B7280",
                                        display: "flex", alignItems: "center",
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = "#F3F4F6")}
                                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                    >
                                      <Eye size={14} />
                                    </button>
                                  )}
                                  {/* Check — resolver (apenas "outro") */}
                                  {a.categoria === "outro" && !isResolved && (
                                    <button
                                      onClick={() => resolve(a.id)}
                                      title="Marcar como resolvido"
                                      style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        padding: 4, borderRadius: 6, color: "#16A34A",
                                        display: "flex", alignItems: "center",
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = "#F0FDF4")}
                                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  {/* X — dismiss */}
                                  <button
                                    onClick={() => dismiss(a.id)}
                                    title="Dispensar alerta"
                                    style={{
                                      background: "none", border: "none", cursor: "pointer",
                                      padding: 4, borderRadius: 6, color: "#D1D5DB",
                                      display: "flex", alignItems: "center",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444" }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#D1D5DB" }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #F0F0F0", flex: "0 0 auto" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", background: "#1A2E44", color: "#fff", border: "none",
              borderRadius: 9, padding: "10px", cursor: "pointer", fontSize: 13,
              fontWeight: 700, letterSpacing: "0.02em", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#243d56")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1A2E44")}
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  )
}
