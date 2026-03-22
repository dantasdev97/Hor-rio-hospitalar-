---
tags: [typescript, interfaces, tipos]
updated: 2026-03-22
---

# 05 — Tipos TypeScript

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/types/index.ts`

---

## 📦 Interfaces Principais

### `Auxiliar`
```typescript
export interface Auxiliar {
  id: string
  nome: string
  email: string | null
  numero_mecanografico: string | null   // N.º mecanográfico do hospital
  contribuinte: string | null           // NIF
  disponivel: boolean                   // Activo no sistema
  trabalha_fds: boolean                 // Trabalha fins de semana
  equipa: 'Equipa 1' | 'Equipa 2' | 'Equipa Transportes' | null  // ← [[25 - Equipas de Auxiliares]]
  created_at: string
}
```

> Campo `equipa` adicionado em 2026-03-22. Migração: `20260321_add_equipa_to_auxiliares.sql` — ver [[04 - Base de Dados]]

### `Ausencia`
```typescript
export interface Ausencia {
  id: string
  auxiliar_id: string
  codigo: string           // D | F | Fe | FAA | L | Aci — ver [[18 - Códigos Especiais]]
  data_inicio: string      // YYYY-MM-DD
  data_fim: string         // YYYY-MM-DD
  created_at: string
}
```

### `Doutor`
```typescript
export interface Doutor {
  id: string
  nome: string
  numero_mecanografico: string | null
  created_at: string
}
```

### `Turno`
```typescript
export interface Turno {
  id: string
  nome: string              // Ex: "M7", "T21", "N5", "MT18"
  horario_inicio: string    // "HH:MM:SS" — usado para classificar M/T/N
  horario_fim: string       // "HH:MM:SS"
  cor: string | null        // Cor hex (#RRGGBB)
  postos: string[]          // Ex: ["RX_URG", "TAC2"] — ver [[19 - Postos e Turnos]]
  created_at: string
}
```

> Classificação M/T/N feita por `turnoToLetra()` — ver [[26 - Classificação M-T-N por Horário]]

### `DoutorTurno`
```typescript
export interface DoutorTurno {
  id: string
  doutor_id: string
  turno_id: string
  turno?: Turno
}
```

### `Escala`
```typescript
export interface Escala {
  id: string
  data: string                            // YYYY-MM-DD
  tipo_escala: 'semanal' | 'mensal'
  turno_id: string | null
  auxiliar_id: string | null
  status: 'disponivel' | 'alocado' | 'bloqueado'
  codigo_especial: string | null          // ver [[18 - Códigos Especiais]]
  turno?: Turno
  auxiliar?: Auxiliar
}
```

### `Restricao`
```typescript
export interface Restricao {
  id: string
  auxiliar_id: string
  turno_id: string | null    // null = restrição só por posto
  posto: string | null       // null = restrição só por turno
  motivo: string | null
  data_inicio: string | null
  data_fim: string | null
}
```

---

## 🏷️ Tipos Locais (definidos nas páginas)

### `EscalaRow` (EscalaMensal e EscalaSemanal)
```typescript
type EscalaRow = {
  id: string           // "mensal_XXXX" = derivado virtual; UUID = real na DB
  data: string
  auxiliar_id: string | null
  doutor_id?: string | null
  turno_id: string | null
  codigo_especial: string | null
  posto?: string | null
  turno_letra?: string | null   // "M" | "T" | "N"
}
```

> IDs `"mensal_*"` são virtuais — ver [[27 - Fix ECO URG Multi-Pessoa]] para impacto nas operações de limpeza.

### `TurnoLetra` (EscalaSemanal, Restricoes)
```typescript
type TurnoLetra = 'M' | 'T' | 'N'
```

> Determinada por `turnoToLetra()` — ver [[26 - Classificação M-T-N por Horário]]

### `AlertaMensal` (EscalaMensal)
```typescript
type AlertaMensal = {
  id: string
  tipo: 'erro' | 'aviso' | 'info'
  categoria: 'ausencia' | 'cobertura' | 'descanso' | 'excesso'
  mensagem: string
  dia?: number
  auxNome?: string
}
```

### `UndoState` (EscalaMensal e EscalaSemanal)
```typescript
type UndoState = {
  inserted: string[]
  deleted: EscalaRow[]
} | null
```

### `TurnoComPostos` (EscalaSemanal)
```typescript
type TurnoComPostos = Turno & { postos: string[] }
```

### `Person` (EscalaSemanal)
```typescript
type Person = { id: string; nome: string; trabalha_fds?: boolean }
```

### `MensalEntry` (EscalaSemanal)
```typescript
type MensalEntry = { id: string; data: string; auxiliar_id: string; turno_id: string }
```

### `EquipaType` (Auxiliares.tsx — local)
```typescript
const EQUIPAS = ['Equipa 1', 'Equipa 2', 'Equipa Transportes'] as const
type EquipaType = typeof EQUIPAS[number]
```

> Ver [[25 - Equipas de Auxiliares]]

---

## 🔗 Ver Também

- [[04 - Base de Dados]] — Schema SQL correspondente
- [[18 - Códigos Especiais]] — Valores de `codigo_especial`
- [[19 - Postos e Turnos]] — Valores de `posto` e `turno_letra`
- [[25 - Equipas de Auxiliares]] — Campo `equipa` no interface Auxiliar
- [[26 - Classificação M-T-N por Horário]] — Como `TurnoLetra` é determinada
- [[27 - Fix ECO URG Multi-Pessoa]] — IDs "mensal_" e limpeza de células
