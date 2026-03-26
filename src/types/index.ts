export interface Auxiliar {
  id: string
  nome: string
  email: string | null
  numero_mecanografico: string | null
  contribuinte: string | null
  disponivel: boolean
  trabalha_fds: boolean
  equipa: 'Equipa 1' | 'Equipa 2' | 'Equipa Transportes' | null
  created_at: string
}

export interface Ausencia {
  id: string
  auxiliar_id: string
  codigo: string
  data_inicio: string
  data_fim: string
  created_at: string
}

export interface Doutor {
  id: string
  nome: string
  numero_mecanografico: string | null
  created_at: string
}

export interface Turno {
  id: string
  nome: string
  horario_inicio: string
  horario_fim: string
  cor: string | null
  postos: string[]
  created_at: string
}

export interface DoutorTurno {
  id: string
  doutor_id: string
  turno_id: string
  turno?: Turno
}

export interface Escala {
  id: string
  data: string
  tipo_escala: 'semanal' | 'mensal'
  turno_id: string | null
  auxiliar_id: string | null
  status: 'disponivel' | 'alocado' | 'bloqueado'
  codigo_especial: string | null
  turno?: Turno
  auxiliar?: Auxiliar
}

export interface Restricao {
  id: string
  auxiliar_id: string
  turno_id: string | null
  posto: string | null
  motivo: string | null
  data_inicio: string | null
  data_fim: string | null
}

export interface TrocaLog {
  id: string
  created_at: string
  tipo_escala: 'semanal' | 'mensal'
  source_aux_id: string
  target_aux_id: string
  source_data: string
  target_data: string
  source_turno_info: Record<string, unknown>
  target_turno_info: Record<string, unknown>
  revertido: boolean
  revertido_at: string | null
  apagado: boolean
}
