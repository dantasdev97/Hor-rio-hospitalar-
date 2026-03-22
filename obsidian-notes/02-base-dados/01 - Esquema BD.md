---
tags: [base-de-dados, supabase, schema, sql]
updated: 2026-03-21
---

# 04 — Base de Dados (Supabase)

> [[00 - MOC (Índice)|← Índice]]

## 📋 Tabelas Existentes

| Tabela | Propósito |
|---|---|
| `auxiliares` | Auxiliares de radiologia (staff) |
| `doutores` | Médicos |
| `turnos` | Turnos de trabalho (M, T, N, etc.) |
| `doutor_turnos` | N:N — médicos ↔ turnos |
| `escalas` | Entradas de escala (mensal e semanal) |
| `restricoes` | Restrições por auxiliar |
| `ausencias` | Períodos de ausência por auxiliar |

---

## 🗄️ Schema Detalhado

### `auxiliares`
| Coluna | Tipo | Constraint | Default |
|---|---|---|---|
| `id` | uuid | PK | gen_random_uuid() |
| `nome` | text | NOT NULL | — |
| `email` | text | nullable | — |
| `numero_mecanografico` | text | nullable | — |
| `contribuinte` | text | nullable | — |
| `disponivel` | boolean | — | true |
| `trabalha_fds` | boolean | — | (implícito no código) |
| `created_at` | timestamptz | — | now() |

### `doutores`
| Coluna | Tipo | Constraint | Default |
|---|---|---|---|
| `id` | uuid | PK | gen_random_uuid() |
| `nome` | text | NOT NULL | — |
| `numero_mecanografico` | text | nullable | — |
| `created_at` | timestamptz | — | now() |

### `turnos`
| Coluna | Tipo | Constraint | Default |
|---|---|---|---|
| `id` | uuid | PK | gen_random_uuid() |
| `nome` | text | NOT NULL | — |
| `horario_inicio` | time | NOT NULL | — |
| `horario_fim` | time | NOT NULL | — |
| `cor` | text | nullable | — |
| `postos` | text[] | — | '{}' |
| `created_at` | timestamptz | — | now() |

> `postos` adicionado na migração `20260316_add_postos_to_turnos.sql`

### `doutor_turnos` (junction N:N)
| Coluna | Tipo | Constraint |
|---|---|---|
| `id` | uuid | PK |
| `doutor_id` | uuid | FK → doutores(id) ON DELETE CASCADE |
| `turno_id` | uuid | FK → turnos(id) ON DELETE CASCADE |

### `escalas`
| Coluna | Tipo | Constraint | Default |
|---|---|---|---|
| `id` | uuid | PK | gen_random_uuid() |
| `data` | date | NOT NULL | — |
| `tipo_escala` | text | CHECK IN ('semanal','mensal') | — |
| `turno_id` | uuid | FK → turnos(id) ON DELETE SET NULL | nullable |
| `auxiliar_id` | uuid | FK → auxiliares(id) ON DELETE CASCADE | nullable |
| `doutor_id` | uuid | FK → doutores(id) | nullable |
| `posto` | text | nullable | — |
| `turno_letra` | text | nullable | — |
| `status` | text | CHECK IN ('disponivel','alocado','bloqueado') | 'disponivel' |
| `codigo_especial` | text | nullable | — |

> Campos `posto`, `turno_letra`, `doutor_id` usados na escala semanal.
> Campo `codigo_especial` usado na escala mensal (D, F, Fe, FAA, L, Aci).

### `restricoes`
| Coluna | Tipo | Constraint |
|---|---|---|
| `id` | uuid | PK |
| `auxiliar_id` | uuid | FK → auxiliares(id) ON DELETE CASCADE |
| `turno_id` | uuid | FK → turnos(id) ON DELETE CASCADE, nullable |
| `posto` | text | nullable |
| `motivo` | text | nullable |
| `data_inicio` | date | nullable |
| `data_fim` | date | nullable |

### `ausencias`
| Coluna | Tipo | Constraint |
|---|---|---|
| `id` | uuid | PK |
| `auxiliar_id` | uuid | FK → auxiliares(id) ON DELETE CASCADE |
| `codigo` | text | NOT NULL |
| `data_inicio` | date | NOT NULL |
| `data_fim` | date | NOT NULL |
| `created_at` | timestamptz | DEFAULT now() |

---

## 🔗 Relações Entre Tabelas

```
auxiliares ──────────────── escalas (auxiliar_id)
auxiliares ──────────────── restricoes (auxiliar_id)
auxiliares ──────────────── ausencias (auxiliar_id)
doutores ────────────────── doutor_turnos (doutor_id)
doutores ────────────────── escalas (doutor_id)
turnos ──────────────────── doutor_turnos (turno_id)
turnos ──────────────────── escalas (turno_id)
turnos ──────────────────── restricoes (turno_id)
```

---

## 🔐 RLS (Row Level Security)

> ⚠️ **Estado actual:** `allow_all` em todas as tabelas — modo desenvolvimento.
> Para produção real deve-se implementar políticas por `auth.uid()`.

Todas as tabelas têm RLS activado mas com policy pública:
```sql
-- Padrão em todas as tabelas
CREATE POLICY "allow_all" ON tabela FOR ALL USING (true);
```

---

## 📁 Ficheiros de Migração

```
supabase/migrations/
├── 20260308_create_hospital_tables.sql  ← Criação inicial de todas as tabelas
└── 20260316_add_postos_to_turnos.sql    ← ALTER TABLE turnos ADD COLUMN postos text[]
```

---

## 💡 Observações / Gaps Conhecidos

> Alguns campos existem no código TypeScript mas podem não estar nas migrações originais:
- `trabalha_fds` na tabela `auxiliares`
- `cor` na tabela `turnos`
- `codigo_especial` na tabela `escalas`
- `posto` na tabela `restricoes`

Estes campos foram adicionados ao longo do desenvolvimento. Verificar se estão nas migrações ou foram adicionados manualmente no Supabase Dashboard.

---

## 🔗 Ver Também

- [[05 - Tipos TypeScript]] — Interfaces TypeScript correspondentes
- [[18 - Códigos Especiais]] — Valores possíveis de `codigo_especial`
- [[19 - Postos e Turnos]] — Valores possíveis de `posto` e `turno_letra`
