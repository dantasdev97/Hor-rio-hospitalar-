# Tipos TypeScript

> Todas as interfaces e tipos do projecto. Ficheiro principal: `src/types/index.ts`

---

## Tipos Globais (`src/types/index.ts`)

### `Auxiliar`
```typescript
interface Auxiliar {
  id: string
  nome: string
  email: string | null
  numero_mecanografico: string | null
  contribuinte: string | null
  disponivel: boolean
  trabalha_fds: boolean
  created_at: string
}
```

### `Ausencia`
```typescript
interface Ausencia {
  id: string
  auxiliar_id: string
  codigo: string           // D | F | Fe | FAA | L | Aci
  data_inicio: string      // yyyy-MM-dd
  data_fim: string         // yyyy-MM-dd
  created_at: string
}
```

### `Doutor`
```typescript
interface Doutor {
  id: string
  nome: string
  numero_mecanografico: string | null
  created_at: string
}
```

### `Turno`
```typescript
interface Turno {
  id: string
  nome: string             // código do turno, ex: "M1", "T2", "N5"
  horario_inicio: string   // "HH:MM"
  horario_fim: string      // "HH:MM"
  cor: string | null       // hex, ex: "#FEF08A"
  postos: string[]         // chaves dos postos associados
  created_at: string
}
```

### `DoutorTurno`
```typescript
interface DoutorTurno {
  id: string
  doutor_id: string
  turno_id: string
  turno?: Turno            // join opcional
}
```

### `Escala`
```typescript
interface Escala {
  id: string
  data: string                          // "yyyy-MM-dd"
  tipo_escala: 'semanal' | 'mensal'
  turno_id: string | null
  auxiliar_id: string | null
  status: 'disponivel' | 'alocado' | 'bloqueado'
  codigo_especial: string | null        // D | F | Fe | FAA | L | Aci
  turno?: Turno                         // join opcional
  auxiliar?: Auxiliar                   // join opcional
}
```

### `Restricao`
```typescript
interface Restricao {
  id: string
  auxiliar_id: string
  turno_id: string | null
  posto: string | null     // chave do posto, ex: "RX_URG"
  motivo: string | null
  data_inicio: string | null
  data_fim: string | null
}
```

---

## Tipos Locais

### `EscalaRow` (em `EscalaMensal.tsx`)
Versão reduzida de `Escala` para o estado local da página mensal.
```typescript
interface EscalaRow {
  id: string
  data: string
  auxiliar_id: string | null
  turno_id: string | null
  codigo_especial: string | null
}
```

### `UndoState` (em `EscalaMensal.tsx`)
Para reverter a última operação de geração ou limpeza.
```typescript
interface UndoState {
  inserted: EscalaRow[]
  deleted: EscalaRow[]
}
```

### `AlertaMensal` (em `EscalaMensal.tsx`)
Um alerta gerado pelo sistema de validação da escala.
```typescript
interface AlertaMensal {
  id: string                                              // chave determinística
  tipo: "erro" | "aviso" | "info"
  categoria: "ausencia" | "cobertura" | "descanso" | "excesso"
  mensagem: string
  detalhe?: string                                        // linha extra de contexto
}
```

---

## Tipos da Escala Semanal (`EscalaSemanal.tsx`)

```typescript
type PostoKey = "RX_URG" | "TAC2" | "TAC1" | "EXAM1" | "EXAM2" | "SALA6" | "SALA7" | "TRANSPORT"
type TurnoLetra = "M" | "T" | "N"
type DayType = "weekday" | "saturday" | "sunday"
```

### `POSTOS` (array constante)
```typescript
const POSTOS = [
  { key: "RX_URG",    label: "RX URG",              bg: "#FFFFFF" },
  { key: "TAC2",      label: "TAC 2",               bg: "#FFFFFF" },
  { key: "TAC1",      label: "TAC 1",               bg: "#FFFFFF" },
  { key: "EXAM1",     label: "Exames Comp. (1)",    bg: "#C4B09A" },
  { key: "EXAM2",     label: "Exames Comp. (2)",    bg: "#C4B09A" },
  { key: "SALA6",     label: "SALA 6 BB",           bg: "#92D050" },
  { key: "SALA7",     label: "SALA 7 EXT",          bg: "#92D050" },
  { key: "TRANSPORT", label: "Transportes INT/URG",  bg: "#FFBE7B" },
] as const
```

---

## Notas Relacionadas

- [[02 - Base de Dados]]
- [[06 - Lógica de Escalas]]
- [[09 - Erros e Alertas]]

#typescript #tipos #interfaces
