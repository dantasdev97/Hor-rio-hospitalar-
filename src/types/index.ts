export interface Auxiliar {
  id: string
  nome: string
  email: string | null
  numero_mecanografico: string | null
  contribuinte: string | null
  disponivel: boolean
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
  especial: 'folga' | 'ferias' | 'descanso' | 'licenca' | null
  turno?: Turno
  auxiliar?: Auxiliar
}

export interface SlotSemanal {
  id: string
  data: string
  turno_tipo: 'N' | 'M' | 'T'
  secao: string
  auxiliar_id: string | null
  doutor_id: string | null
  doutor2_id: string | null
  especial: 'folga' | 'ferias' | 'descanso' | 'licenca' | null
  auxiliar?: Auxiliar
  doutor?: Doutor
  doutor2?: Doutor
  created_at: string
}

export interface Restricao {
  id: string
  auxiliar_id: string
  turno_id: string
  motivo: string | null
  data_inicio: string | null
  data_fim: string | null
}
