---
tags: [escala-semanal, postos, sincronização, troca-turno]
updated: 2026-03-26
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
| `alertasModalOpen` | boolean | Painel de alertas aberto |
| `blinkCell` | CellRef\|null | Célula a piscar (via eye icon) |
| `blinkIsUrg` | boolean | Se o blink é vermelho (URG) ou amarelo |
| `multiPickerOpen` | boolean | Modal picker de aux para células multi-pessoa |
| `multiPickerCell` | {data, turnoLetra, posto, auxIds}\|null | Célula multi em edição/swap |
| `multiPickerCallback` | ((auxId:string)=>void)\|null | Callback após selecção no picker |

---

## 🚨 Sistema de Alertas (v2 — Unificado)

Painel de alertas partilhado com a mensal. Detecta problemas de cobertura por post + turno.

### Postos Críticos (URG) → Alerta VERMELHO
- **RX URG** (M, T, N) — urgência máxima
- **TAC 2** (M, T, N) — cobertura nocturna crítica
- **EXAM1** (M, T) — eco urgência
- **TRANSPORT** (M, T) — transportes urgência

### Postos Não-Urgentes → Alerta AMARELO
- **TAC 1** (M, T), **EXAM2** (M, T), **SALA 6** (M), **SALA 7** (M, T)

### Feedback Visual
- **Cores permanentes** nas células vazias:
  - Red-100 (`#FEE2E2`) para postos URG sem cobertura
  - Yellow-100 (`#FEF9C3`) para postos não-URG sem cobertura
- **Blink animation** (3 vezes 1s) ao clicar eye no painel
  - Vermelho para URG, amarelo para não-URG

### Componente
- `AlertPanel` em `src/components/alerts/AlertPanel.tsx`
- Tipos `AlertaUnificado` em `src/components/alerts/alertTypes.ts`
- Cálculo `calcularAlertasSemanal()` retorna `AlertaUnificado[]`

Ver [[10 - Sistema de Alertas]] para detalhes completos.

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

## 🔄 Troca de Turno (Swap v3)

Permite trocar dois auxiliares entre postos/turnos. Dois mecanismos — agora suportam células **multi-pessoa** (EXAM1, EXAM2, TRANSPORT).

### Mecanismo 1: Botão no Modal
1. Clicar numa célula com auxiliar atribuído → modal mostra botão **"Trocar"**
   - Células single: usa o único aux directamente
   - Células multi (EXAM1/EXAM2): abre picker para seleccionar qual aux trocar
2. Clicar no botão → sub-vista de troca:
   - **Passo 1**: Lista de auxiliares com turnos na semana
   - **Passo 2**: Seleccionar turno do auxiliar alvo (cards com dia/turno/posto)
   - **Passo 3**: Confirmação visual + secção **"Resultado:"** com o estado final
3. Confirmar → `executeSwap()` executa a troca com reverse sync

### Mecanismo 2: Ctrl+Click Quick Swap
1. Manter **Ctrl** pressionado e clicar célula com aux → selecciona (destaque azul)
   - Células multi com 1 aux: comporta-se como single
   - Células multi com >1 aux: **picker modal** para escolher qual aux
2. Ctrl+Click noutra célula com aux diferente → modal de confirmação com **"Resultado:"**
3. Confirmar → troca automática
4. Soltar Ctrl ou perder foco → limpa selecção

### Multi-picker Modal
Aparece quando Ctrl+Click ou botão Trocar é acionado em célula com >1 aux.
- Lista os nomes dos auxiliares presentes na célula
- Ao clicar num → continua o fluxo normal de swap com esse aux como source
- Backdrop escuro; cancelar fecha o picker sem acção

### Secção "Resultado:" nos Modais de Confirmação
Aparece antes dos botões em ambos os modais de confirmação, com **horário do turno**:
```
Resultado:
[NomeA] faz Turno M (08:00–16:00) em [Posto B] — [dia B]
[NomeB] faz Turno T (16:00–00:00) em [Posto A] — [dia A]
```
O horário é obtido via `turnosData.find(t => turnoToLetra(t) === turnoLetra)` → `horario_inicio`–`horario_fim`.

### Logging para `trocas_log` (2026-03-26)
Após swap bem-sucedido, `executeSwap()` insere registo em `trocas_log`:
- `tipo_escala: "semanal"`
- `source_turno_info: { turnoLetra, posto, postoLabel }`
- `target_turno_info: { turnoLetra, posto, postoLabel }`
- `postoLabel` obtido via `POSTOS.find(p => p.key === posto)?.nome`
- Logging silencioso (try/catch sem propagação) — falha não bloqueia a troca
- Ver [[15 - Livro de Trocas]] para gestão do histórico

### `openSwapModeForAux(auxId: string)`
Variante de `openSwapMode()` que recebe o auxId explicitamente — usada pelo botão Trocar em células multi-pessoa.

### `handleCtrlClickWithAux(data, turnoLetra, posto, auxId)`
Variante de `handleCtrlClick` que recebe o auxId explicitamente — usada pelo Ctrl+Click em células multi-pessoa.

### `executeSwap(source, target, targetAuxId)`
Operação em 8 passos:
1. DELETE AuxA da célula source (semanal)
2. DELETE AuxB da célula target (semanal)
3. INSERT AuxB na célula source
4. INSERT AuxA na célula target
5. Reverse sync mensal: AuxB no turno de source
6. Reverse sync mensal: AuxA no turno de target
7. Cleanup mensal entries antigas + refetch
8. INSERT em `trocas_log` (logging silencioso)

### `getAuxShiftsForWeek(auxId)`
Retorna todos os turnos do auxiliar na semana actual (data, turnoLetra, posto, postoLabel).

### Estado de Swap

| State | Tipo | Propósito |
|---|---|---|
| `swapMode` | boolean | Modal em modo de troca |
| `swapSourceCell` | {data, turnoLetra, posto, auxId} | Célula origem |
| `swapTargetAuxId` | string | Aux alvo seleccionado |
| `swapTargetCell` | {data, turnoLetra, posto} | Célula alvo seleccionada |
| `swapConfirmOpen` | boolean | Modal confirmação Ctrl+Click |
| `swapping` | boolean | Troca em curso |
| `ctrlHeld` | boolean | Ctrl pressionado |
| `ctrlSelectedCell` | {data, turnoLetra, posto, auxId} | Célula seleccionada via Ctrl |
| `swappedCells` | Set\<string\> | Células recentemente trocadas (flash visual) — chave: `"data\|turnoLetra\|posto"` |
| `multiPickerOpen` | boolean | Picker de aux para células multi-pessoa |
| `multiPickerCell` | {data, turnoLetra, posto, auxIds}\|null | Célula multi em contexto |
| `multiPickerCallback` | ((auxId:string)=>void)\|null | Acção após selecção no picker |

### Feedback Visual (Flash)
Após confirmar troca, as duas células afectadas ficam com borda azul animada por ~2.5s via CSS `@keyframes swapFlash`. A chave do Set é `"data|turnoLetra|posto"`.

### Mensagens de Confirmação (formato natural)
```
[Nome] faz Turno [M/T/N] em [RX URG] — Seg 4
```

### Fix: Remoção de Aux em Células Multi (EXAM2 M)
`isDisabledFinal` corrigido — auxiliar já seleccionado (`isSel`) numa célula multi nunca fica bloqueado, permitindo deseleccioná-lo:
```ts
const isDisabledFinal = (isSel && isDouble) ? false : (isBlocked || isDisabledMulti)
```

### Restrições
- Não é possível trocar aux consigo mesmo
- Células multi suportadas: EXAM1 M/T (max 2), EXAM2 M (max 3), TRANSPORT M (max 2)
- Ambos os sentidos reflectem na escala mensal

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
