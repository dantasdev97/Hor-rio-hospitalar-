---
tags: [livro-trocas, gerenciamento, swap, histórico]
updated: 2026-03-26
---

# 15 — Livro de Trocas

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/LivroTrocas.tsx` (~470 linhas)
> Rota: `/livro-trocas`
> Sidebar: grupo **Gerenciamento**, ícone `BookOpen`

## O Que Faz

Página de histórico e gestão de todas as trocas de turno realizadas nas escalas semanal e mensal. Permite visualizar, filtrar, reverter e apagar registos de trocas.

---

## Tabela BD: `trocas_log`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | Gerado automaticamente |
| `created_at` | timestamptz | Data/hora da troca |
| `tipo_escala` | text | `'semanal'` ou `'mensal'` |
| `source_aux_id` | uuid (FK → auxiliares) | Auxiliar A |
| `target_aux_id` | uuid (FK → auxiliares) | Auxiliar B |
| `source_data` | text | Data ISO da célula do source |
| `target_data` | text | Data ISO da célula do target |
| `source_turno_info` | jsonb | Info do turno original do source |
| `target_turno_info` | jsonb | Info do turno original do target |
| `revertido` | boolean | Se a troca foi revertida |
| `revertido_at` | timestamptz | Quando foi revertida |
| `apagado` | boolean | Soft-delete |

**JSONB shapes:**
- **Semanal:** `{ turnoLetra: "M", posto: "EXAM1", postoLabel: "ECO URG" }`
- **Mensal:** `{ turnoId: "uuid", turnoNome: "M3", codigoEspecial: null }`

Migration: `supabase/migrations/20260326_create_trocas_log.sql`

---

## Estado (useState)

| State | Tipo | Propósito |
|---|---|---|
| `logs` | TrocaLog[] | Lista de trocas (não apagadas) |
| `auxMap` | Record<string, string> | Mapa id → nome dos auxiliares |
| `loading` | boolean | A carregar dados |
| `error` | string \| null | Erro de carregamento |
| `filtroTipo` | "todos" \| "semanal" \| "mensal" | Filtro por tipo de escala |
| `filtroEstado` | "todos" \| "ativo" \| "revertido" | Filtro por estado |
| `confirmReverter` | TrocaLog \| null | Troca a reverter (dialog aberto) |
| `confirmApagar` | TrocaLog \| null | Troca a apagar (dialog aberto) |
| `actionLoading` | boolean | Ação em curso |
| `actionError` | string \| null | Erro na ação |

---

## Funcionalidades

- [x] Tabela com colunas: Data/Hora, Tipo (badge), Auxiliar A, Auxiliar B, Detalhes, Estado (badge), Ações
- [x] Filtros: tipo (semanal/mensal/todos), estado (ativo/revertido/todos)
- [x] Reverter troca com dialog de confirmação
- [x] Apagar registo (soft-delete) com dialog de confirmação
- [x] Feedback de erro inline nos dialogs
- [x] Loading spinner e empty state

---

## Lógica de Botões

| Botão | Ação | Lógica |
|-------|------|--------|
| Reverter (↩) | Desfaz a troca na tabela `escalas` | Dialog → `handleReverter()` |
| Apagar (🗑) | Remove registo da lista | Dialog → `handleApagar()` |

### Reverter — Mensal

1. Update `escalas` do source: repõe `turno_id` e `codigo_especial` originais
2. Update `escalas` do target: repõe `turno_id` e `codigo_especial` originais
3. Mark `trocas_log`: `revertido = true, revertido_at = now()`

### Reverter — Semanal

1. Delete escalas atuais do source (que tem o turno do target)
2. Delete escalas atuais do target (que tem o turno do source)
3. Re-insert escala original do source (`turno_letra` + `posto`)
4. Re-insert escala original do target (`turno_letra` + `posto`)
5. Mark `trocas_log`: `revertido = true, revertido_at = now()`

### Apagar

1. `UPDATE trocas_log SET apagado = true WHERE id = ?`
2. Registo removido da lista (filtrado por `apagado = false` no fetch)

---

## Logging de Trocas

Os registos são criados automaticamente quando uma troca é executada:

- **EscalaMensal.tsx** → `executeMensalSwap()`: insere em `trocas_log` após swap bem-sucedido
- **EscalaSemanal.tsx** → `executeSwap()`: insere em `trocas_log` após swap bem-sucedido

O logging é silencioso (try/catch sem propagação) — falha no log não bloqueia a troca.

---

## Componentes UI

- shadcn/ui: `Table`, `Badge`, `Button`, `Dialog`, `Select`
- Lucide: `BookOpen`, `RotateCcw`, `Trash2`, `Loader2`, `AlertCircle`
- Badges coloridos: Semanal (azul), Mensal (verde), Ativo (verde), Revertido (amarelo)

---

## Tipo TypeScript

```ts
// src/types/index.ts
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
```
