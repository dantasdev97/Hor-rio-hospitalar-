---
tags: [typescript, interfaces, tipos]
updated: 2026-03-21
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
  created_at: string
}
```

### `Ausencia`
```typescript
export interface Ausencia {
  id: string
  auxiliar_id: string
  codigo: string           // D | F | Fe | FAA | L | Aci
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
  nome: string              // Ex: "M1", "T2", "N5", "MT_TAC"
  horario_inicio: string    // "HH:MM:SS" — hora de início
  horario_fim: string       // "HH:MM:SS" — hora de fim
  cor: string | null        // Cor hex personalizada (#RRGGBB)
  postos: string[]          // Postos associados: ["RX_URG", "TAC2"]
  created_at: string
}
```

### `DoutorTurno`
```typescript
export interface DoutorTurno {
  id: string
  doutor_id: string
  turno_id: string
  turno?: Turno             // Relação carregada opcionalmente
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
  codigo_especial: string | null          // D | F | Fe | FAA | L | Aci
  turno?: Turno                           // Relação opcional
  auxiliar?: Auxiliar                     // Relação opcional
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
  data_inicio: string | null // null = sem limite de início
  data_fim: string | null    // null = sem limite de fim
}
```

---

## 🏷️ Tipos Locais (definidos nas páginas)

### `EscalaRow` (usado em EscalaMensal e EscalaSemanal)
```typescript
// Versão simplificada da Escala para uso interno nas páginas
type EscalaRow = {
  id: string
  data: string
  auxiliar_id: string | null
  doutor_id?: string | null
  turno_id: string | null
  codigo_especial: string | null
  posto?: string | null
  turno_letra?: string | null
}
```

### `AlertaMensal` (EscalaMensal)
```typescript
type AlertaMensal = {
  id: string          // Unique key para tracking de resoluções
  tipo: 'erro' | 'aviso' | 'info'
  categoria: 'ausencia' | 'cobertura' | 'descanso' | 'excesso'
  mensagem: string
  dia?: number        // Dia do mês onde ocorre
  auxNome?: string    // Nome do auxiliar envolvido
}
```

### `UndoState` (EscalaMensal e EscalaSemanal)
```typescript
type UndoState = {
  inserted: string[]    // IDs inseridos (para apagar no undo)
  deleted: EscalaRow[]  // Registos apagados (para re-inserir no undo)
} | null
```

### `TurnoLetra` (EscalaSemanal)
```typescript
type TurnoLetra = 'M' | 'T' | 'N'
```

### `TurnoComPostos` (EscalaSemanal)
```typescript
type TurnoComPostos = Turno & { postos: string[] }
```

### `Person` (EscalaSemanal)
```typescript
type Person = {
  id: string
  nome: string
  trabalha_fds?: boolean
}
```

### `MensalEntry` (EscalaSemanal)
```typescript
type MensalEntry = {
  id: string
  data: string
  auxiliar_id: string
  turno_id: string
}
```

---

## 🔗 Ver Também

- [[04 - Base de Dados]] — Schema SQL correspondente
- [[18 - Códigos Especiais]] — Valores de `codigo_especial`
- [[19 - Postos e Turnos]] — Valores de `posto` e `turno_letra`
