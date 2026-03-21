---
tags: [escala-semanal, postos, sincronização]
updated: 2026-03-21
---

# 07 — Escala Semanal

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/EscalaSemanal.tsx` (~76 KB / ~2000 linhas)

## 🎯 O Que Faz

Vista semanal da escala organizada por **postos de trabalho** × **turnos** × **dias**.
- Cada célula = um posto + turno + dia
- Pode ter 1 ou mais pessoas (auxiliar ou médico)
- Deriva dados da escala mensal + permite overrides manuais

---

## 🏢 Os 8 Postos (POSTOS)

| Chave | Label | Tipo |
|---|---|---|
| `RX_URG` | RX URG | Auxiliar |
| `TAC2` | TAC 2 | Auxiliar |
| `TAC1` | TAC 1 | Auxiliar |
| `EXAM1` | Exames Comp. (1) | Auxiliar (M/T) / Doutor (N) |
| `EXAM2` | Exames Comp. (2) | Auxiliar (M/T) / Doutor (N) |
| `SALA6` | SALA 6 BB | Auxiliar |
| `SALA7` | SALA 7 EXT | Auxiliar |
| `TRANSPORT` | Transportes INT/URG | Auxiliar |

---

## 📅 Regras de Funcionamento por Posto (POSTO_SCHEDULE)

| Posto | Turnos | Dias |
|---|---|---|
| `RX_URG` | M, T, N | Todos |
| `TAC2` | M, T, N | Todos |
| `EXAM1` | M, T, N | Todos |
| `EXAM2` | M, T | Dias úteis + sábado |
| `TRANSPORT` | M, T | Todos |
| `TAC1` | M, T | Dias úteis + sábado |
| `SALA6` | M | Todos |
| `SALA7` | M, T | Todos |

---

## 👥 Máximo de Pessoas por Célula

| Posto + Turno | Máximo |
|---|---|
| `TRANSPORT + M` | 2 auxiliares |
| `EXAM1 + M` ou `EXAM1 + T` | 2 auxiliares |
| `EXAM2 + M` | 3 auxiliares |
| Todos os outros | 1 pessoa |

---

## 📦 Estado (useState)

| State | Tipo | Propósito |
|---|---|---|
| `referenceDate` | Date | Data de referência da semana |
| `auxiliares` | Person[] | Auxiliares disponíveis |
| `doutores` | Person[] | Médicos |
| `escalas` | EscalaRow[] | Entradas semanal da semana |
| `mensalEntries` | MensalEntry[] | Entradas mensal (para derivação) |
| `turnosData` | TurnoComPostos[] | Turnos com postos |
| `restricoes` | Restricao[] | Restrições activas |
| `loading` | boolean | A carregar |
| `saving` | boolean | A guardar |
| `undoState` | UndoState | Para desfazer |
| `undoing` | boolean | Undo em curso |
| `showClear` | boolean | Modal confirmação limpeza |
| `dialogOpen` | boolean | Modal edição de célula |
| `selCell` | {data, turnoLetra, posto, tipo} | Célula seleccionada |
| `selPersonId` | string | Pessoa seleccionada (single) |
| `selPersonIds` | string[] | Pessoas seleccionadas (multi) |
| `filterTab` | "available"\|"restricted"\|"allocated" | Tab activa no modal |
| `search` | string | Pesquisa no modal |

---

## 🔧 Funções Chave

### `postoOpera(posto, turno, dateStr): boolean`
Verifica se um posto funciona num dado turno/dia — usa POSTO_SCHEDULE.

### `auxTemRestricao(auxId, posto, turnoLetra, date): boolean`
Verifica se existe restrição activa para este auxiliar/posto/turno/data.
- Pode ser restrição só por turno, só por posto, ou combinada.

### `getAuxBlockReason(auxId, posto, turnoLetra, data): string | null`
Verifica **hard-blocks**:
1. Se `bloquearTurnosConsecutivos=true` e já tem N no mesmo dia → bloqueia M
2. Se `alertasConflito=true` e já tem outro posto no mesmo turno/dia → bloqueia

### `getEscala / getEscalas`
- `getEscala()` — retorna 1 entrada (prioridade: semanal > mensal derivado)
- `getEscalas()` — retorna array para células multi-pessoa
- Filtra auxiliares já alocados noutros postos (`busyAuxIds`)

### `saveEscala()`
1. Valida hard-blocks → rejeita se bloqueado
2. Para TRANSPORT+M: gere delete/insert por pessoa
3. **Reverse sync:** actualiza escala mensal para reflectir o override
4. Actualiza estado local + toast

### `clearEscala()`
- Single: apaga apenas entrada semanal + entrada mensal correspondente
- Multi: apaga todas as entradas da célula
- `clearDerivedOverride()`: apaga entrada mensal derivada (para "limpar" semanal)

---

## 📊 Queries Supabase

```typescript
// Fetch completo (Promise.all)
supabase.from("auxiliares").select("id,nome,trabalha_fds").eq("disponivel",true).order("nome")
supabase.from("doutores").select("id,nome").order("nome")
supabase.from("escalas").select("id,data,posto,turno_letra,auxiliar_id,doutor_id")
  .eq("tipo_escala","semanal").gte("data",start).lte("data",end)
  .not("posto","is",null).not("turno_letra","is",null)
supabase.from("escalas").select("id,data,auxiliar_id,turno_id")
  .eq("tipo_escala","mensal").gte("data",start).lte("data",end)
  .not("turno_id","is",null)
supabase.from("turnos").select("id,nome,horario_inicio,horario_fim,postos")
supabase.from("restricoes").select("id,auxiliar_id,turno_id,posto,motivo,data_inicio,data_fim")
```

---

## 🔁 Sincronização com Escala Mensal

```
Escala Mensal gera turno_id para cada auxiliar/dia
        ↓
EscalaSemanal lê mensalEntries e "deriva" qual posto/turno
        ↓ (utilizador edita na semanal)
saveEscala() → cria/actualiza escalas(semanal)
             → faz upsert em escalas(mensal) com turno_id correspondente
        ↓ Realtime
EscalaMensal reflecte a alteração
```

---

## 🔗 Ver Também

- [[19 - Postos e Turnos]] — POSTOS, POSTO_SCHEDULE, regras
- [[11 - Restrições]] — Lógica de restrições
- [[20 - PDF e Exportação]] — PDF semanal
- [[21 - Configurações LocalStorage]] — bloquearTurnosConsecutivos, alertasConflito
