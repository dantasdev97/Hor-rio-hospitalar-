// ─── Tipos e Constantes do Sistema de Alertas ────────────────────────────────

/** Postos de urgência — alerta VERMELHO quando vazio */
export const URG_POSTOS: Record<string, string[]> = {
  RX_URG:    ["M", "T", "N"],
  TAC2:      ["M", "T", "N"],
  EXAM1:     ["M", "T"],         // Eco URG
  TRANSPORT: ["M", "T"],         // Transportes INT/URG
}

/** Postos não-urgentes — alerta AMARELO quando vazio */
export const NON_URG_POSTOS: Record<string, string[]> = {
  TAC1:  ["M", "T"],
  EXAM2: ["M", "T"],             // Eco complementar
  SALA6: ["M"],
  SALA7: ["M", "T"],
}

/** Nomes completos dos turnos em PT-PT */
export const TURNO_FULL: Record<string, string> = {
  M: "Manhã",
  T: "Tarde",
  N: "Noite",
}

/** Severidade de um alerta */
export type Severidade = "vermelho" | "amarelo" | "info"

/** Categorias de alertas */
export type CategoriaAlerta =
  | "cobertura_urg"
  | "cobertura_geral"
  | "descanso"
  | "excesso_mais"
  | "excesso_menos"
  | "ausencia"
  | "outro"

/** Referência a uma célula no grid para localização visual */
export interface CellRef {
  data: string
  turnoLetra: string
  posto?: string
  auxiliarId?: string
}

/** Interface unificada de alerta para ambas as escalas */
export interface AlertaUnificado {
  id: string
  severidade: Severidade
  categoria: CategoriaAlerta
  mensagem: string
  detalhe?: string
  cellRef?: CellRef
  isUrg: boolean
  acao?: { label: string; auxId: string; dia: number }
}

/** Configuração das secções do painel de alertas */
export const SECTION_CONFIG: {
  key: CategoriaAlerta
  label: string
  icon: string
  borderColor: string
  bgColor: string
  titleColor: string
}[] = [
  { key: "cobertura_urg",  label: "Falta de Postos URG",   icon: "🚨", borderColor: "#EF4444", bgColor: "#FEF2F2", titleColor: "#991B1B" },
  { key: "cobertura_geral",label: "Postos sem Auxiliar",    icon: "⚠️", borderColor: "#F59E0B", bgColor: "#FFFBEB", titleColor: "#92400E" },
  { key: "descanso",       label: "Violações de Descanso",  icon: "😴", borderColor: "#F59E0B", bgColor: "#FFFBEB", titleColor: "#92400E" },
  { key: "excesso_mais",   label: "Horas a mais",           icon: "📈", borderColor: "#F59E0B", bgColor: "#FFFBEB", titleColor: "#92400E" },
  { key: "excesso_menos",  label: "Poucas horas",           icon: "📉", borderColor: "#3B82F6", bgColor: "#EFF6FF", titleColor: "#1E40AF" },
  { key: "ausencia",       label: "Ausências Registadas",   icon: "📋", borderColor: "#3B82F6", bgColor: "#EFF6FF", titleColor: "#1E40AF" },
  { key: "outro",          label: "Outros avisos",          icon: "💡", borderColor: "#9CA3AF", bgColor: "#F9FAFB", titleColor: "#374151" },
]

/** Determina severidade de um alerta de cobertura com base no posto e turno */
export function classificarCobertura(posto: string, turnoLetra: string): { severidade: Severidade; categoria: CategoriaAlerta; isUrg: boolean } {
  if (URG_POSTOS[posto]?.includes(turnoLetra)) {
    return { severidade: "vermelho", categoria: "cobertura_urg", isUrg: true }
  }
  if (NON_URG_POSTOS[posto]?.includes(turnoLetra)) {
    return { severidade: "amarelo", categoria: "cobertura_geral", isUrg: false }
  }
  return { severidade: "info", categoria: "outro", isUrg: false }
}
