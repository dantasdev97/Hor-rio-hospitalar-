# Base de Dados — Supabase

> Schema PostgreSQL gerido pelo Supabase. Migrações em `supabase/migrations/`.

---

## Tabelas

### `auxiliares`
Auxiliares de acção médica (staff principal das escalas).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | gerado automaticamente |
| nome | text, NOT NULL | nome completo |
| email | text | opcional |
| numero_mecanografico | text | nº de identificação interno |
| contribuinte | text | NIF |
| disponivel | boolean, default: true | se está activo/disponível |
| trabalha_fds | boolean | se trabalha fins-de-semana |
| created_at | timestamptz | data de criação |

---

### `doutores`
Médicos do serviço.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | — |
| nome | text, NOT NULL | — |
| numero_mecanografico | text | — |
| created_at | timestamptz | — |

---

### `turnos`
Definição dos turnos de trabalho.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | — |
| nome | text, NOT NULL | código do turno (ex: M1, T2, N5) |
| horario_inicio | time, NOT NULL | hora de início (ex: 08:00) |
| horario_fim | time, NOT NULL | hora de fim (ex: 16:00) |
| cor | text | cor hex para display |
| postos | text[], default: {} | array de chaves de postos associados |
| created_at | timestamptz | — |

> **Convenção de nomes:** M = manhã, T = tarde, N = noturno (ex: N5 = noite 5ª linha)

---

### `doutor_turnos`
Relação N:N entre médicos e turnos que podem fazer.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | — |
| doutor_id | uuid, FK → doutores | — |
| turno_id | uuid, FK → turnos | — |

---

### `escalas`
Registo de cada atribuição de turno ou código especial.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | — |
| data | date, NOT NULL | data da entrada |
| tipo_escala | text CHECK | `'semanal'` ou `'mensal'` |
| turno_id | uuid, FK → turnos | null se for código especial |
| auxiliar_id | uuid, FK → auxiliares | — |
| status | text CHECK | `'disponivel'` / `'alocado'` / `'bloqueado'` |
| codigo_especial | text | D, F, Fe, FAA, L, Aci (ver [[07 - Códigos Especiais]]) |
| created_at | timestamptz | — |

---

### `restricoes`
Restrições de um auxiliar a determinado turno, posto ou período.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | — |
| auxiliar_id | uuid, FK → auxiliares, NOT NULL | — |
| turno_id | uuid, FK → turnos | null = restrição por posto |
| posto | text | chave do posto (ex: RX_URG) |
| motivo | text | motivo da restrição |
| data_inicio | date | início do período de restrição |
| data_fim | date | fim do período de restrição |

---

### `ausencias`
Períodos de ausência de um auxiliar.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | — |
| auxiliar_id | uuid, FK → auxiliares | — |
| codigo | text | D, F, Fe, FAA, L, Aci |
| data_inicio | date | — |
| data_fim | date | — |
| created_at | timestamptz | — |

---

## Relações

```
auxiliares ──< escalas >── turnos
auxiliares ──< restricoes >── turnos
auxiliares ──< ausencias
doutores   ──< doutor_turnos >── turnos
```

---

## Segurança (RLS)

- RLS activado em todas as tabelas
- Políticas actuais: **allow_all** (modo desenvolvimento)
- **TODO em produção real:** substituir por políticas baseadas em `auth.uid()` e roles

---

## Migrações

| Ficheiro | O que faz |
|---------|-----------|
| `20260308_create_hospital_tables.sql` | Cria todas as tabelas base |
| `20260316_add_postos_to_turnos.sql` | Adiciona coluna `postos text[]` à tabela `turnos` |

---

## Notas Relacionadas

- [[01 - Visão Geral]]
- [[05 - Tipos TypeScript]]
- [[07 - Códigos Especiais]]

#database #supabase #schema #sql
