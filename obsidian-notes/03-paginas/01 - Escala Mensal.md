---
tags: [escala-mensal, geração, alertas, pdf]
updated: 2026-03-25
---

# 06 — Escala Mensal

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/EscalaMensal.tsx` (~68 KB / ~1300 linhas)

## 🎯 O Que Faz

Página principal do sistema. Mostra a escala do mês completo num calendário tabular:
- **Linhas:** auxiliares (ordenados por número mecanográfico)
- **Colunas:** dias do mês
- **Células:** turno atribuído ou código especial

---

## 📦 Estado (useState)

| State | Tipo | Propósito |
|---|---|---|
| `currentDate` | Date | Mês/ano actualmente visualizado |
| `auxiliares` | Auxiliar[] | Lista de todos os auxiliares |
| `turnos` | Turno[] | Lista de todos os turnos |
| `escalas` | EscalaRow[] | Entradas de escala do mês actual |
| `loading` | boolean | A carregar dados |
| `saving` | boolean | A guardar célula |
| `generating` | boolean | Geração automática em curso |
| `genProgress` | {current, total} | Progresso da geração |
| `genLog` | string[] | Log da geração (UI) |
| `flashCells` | Set\<string\> | Células a animar brevemente |
| `undoState` | UndoState | Estado para desfazer |
| `undoing` | boolean | Undo em curso |
| `showClear` | boolean | Modal de confirmação de limpeza |
| `sharingWA` | boolean | A partilhar no WhatsApp |
| `showToast` / `toastMsg` | boolean/string | Notificação toast |
| `dialogOpen` | boolean | Modal de edição de célula aberto |
| `selCell` | {auxiliarId, data} | Célula seleccionada |
| `selTurnoId` | string\|null | Turno seleccionado no modal |
| `selCodigo` | string\|null | Código especial seleccionado no modal |
| `search` | string | Pesquisa no modal |
| `drawerAux` | Auxiliar\|null | Auxiliar no drawer lateral |
| `alertasModalOpen` | boolean | Painel de alertas aberto |
| `blinkCell` | CellRef\|null | Célula a piscar (via eye icon) |
| `blinkIsUrg` | boolean | Se o blink é vermelho (URG) ou amarelo |

---

## 🚨 Sistema de Alertas (v2 — Unificado)

Painel de alertas partilhado com a semanal. Detecta problemas de cobertura, descanso, excessos, e ausências.

### Categorias (7 secções)
1. **Falta de Postos URG** (borda vermelha) — Postos críticos sem auxiliar
2. **Postos sem Auxiliar** (borda amarela) — Postos não-URG vazios
3. **Violações de Descanso** (borda amarela) — Turno N seguido de M/T no dia seguinte
4. **Horas a mais** (borda amarela) — Excessos de turnos/horas
5. **Poucas horas** (borda azul) — Défice de horas
6. **Ausências Registadas** (borda azul) — Códigos especiais ou sem turnos
7. **Outros avisos** (borda cinza) — Avisos genéricos

### Ícones de Ação
- 👁 **Eye** — Localizar na tabela (faz piscar a célula)
- ✕ **X** — Dispensar alerta (local, reseta ao actualizar dados)
- ✓ **Check** — Marcar como resolvido (apenas categoria "outro")

### Componente
- `AlertPanel` em `src/components/alerts/AlertPanel.tsx`
- Tipos `AlertaUnificado` em `src/components/alerts/alertTypes.ts`
- Classificação automática `classificarCobertura(posto, turnoLetra)`

Ver [[10 - Sistema de Alertas]] para detalhes completos.

---

## 🔄 Troca de Turno (Swap Mensal)

Permite trocar o turno de dois auxiliares em dias diferentes do mesmo mês. Dois mecanismos:

### Mecanismo 1: Botão "Trocar" no Modal
1. Clicar numa célula com turno atribuído → modal mostra botão **"Trocar"** no footer
2. Clicar → modal de 3 passos:
   - **Passo 1**: Lista de auxiliares com turnos no mês (excluindo source)
   - **Passo 2**: Turnos do mês do auxiliar seleccionado
   - **Passo 3**: Confirmação `"[AuxA] faz [N5] — 4 Seg" ↔ "[AuxB] faz [M3] — 10 Seg"`
3. Confirmar → `executeMensalSwap()` executa a troca

### Mecanismo 2: Ctrl+Click Quick Swap
1. Manter **Ctrl** e clicar célula com turno → selecção azul (`#DBEAFE` / `#2563EB`)
2. Ctrl+Click noutra célula de auxiliar diferente → modal confirmação
3. Confirmar → troca automática

### `executeMensalSwap(source, target)`
Troca `turno_id` entre dois `EscalaRow`:
1. UPDATE/INSERT source com `turno_id` do target
2. UPDATE/INSERT target com `turno_id` do source
3. Actualização local optimista de `setEscalas()`
4. Flash visual (`swappedCellsMensal`) por ~2.5s
5. Toast "✅ Troca realizada: AuxA ↔ AuxB"

### `getAuxShiftsForMonth(auxId)`
Retorna todos os turnos do auxiliar no mês: `{data, turnoId, turnoNome, dayNum}[]`.

### Estado de Swap Mensal

| State | Tipo | Propósito |
|---|---|---|
| `swapMensal` | boolean | Modal de swap aberto |
| `swapMensalSource` | SwapMensalCell\|null | Célula origem `{auxId, data, turnoId, turnoNome}` |
| `swapMensalTargetAuxId` | string\|null | Auxiliar alvo seleccionado (Passo 2) |
| `swapMensalTargetShift` | SwapMensalCell\|null | Turno alvo seleccionado (Passo 3) |
| `swapMensalConfirmOpen` | boolean | Modal confirmação Ctrl+Click |
| `swappingMensal` | boolean | Troca em curso |
| `ctrlHeldMensal` | boolean | Ctrl pressionado (listener separado) |
| `ctrlSelMensal` | SwapMensalCell\|null | Célula seleccionada via Ctrl |
| `swappedCellsMensal` | Set\<string\> | Células afectadas (flash visual) — chave: `"auxId_data"` |

---

## 🔧 Funções Helper

### `isNoturnoTurno(t: Turno): boolean`
Determina se um turno é nocturno:
- `horario_inicio >= "20:00"` → nocturno
- `nome.startsWith("N")` → nocturno
- Caso contrário → não nocturno

### `toMinutes(time: string): number`
Converte `"HH:MM"` em minutos desde meia-noite.

### `restHoursBetween(prev, nextInicio): number`
Calcula horas de descanso entre dois turnos.
- Se o turno anterior é nocturno e `fim < inicio` → crossing midnight (soma 24h)

### `deriveTurnoColor(nome: string): {bg, text}`
Cor automática por padrão do nome:
- `MT*` → azul claro
- `TAC*` / `ECO*` / `RX*` → amarelo-verde
- `T*` → rosa
- `M*` → amarelo
- `N*` → índigo

### `getSpecialColor(code: string): {bg, text}`
Cores dos códigos especiais → ver [[18 - Códigos Especiais]]

---

## 📊 Queries Supabase

```typescript
// Fetch inicial (Promise.all)
supabase.from("auxiliares").select("*")
supabase.from("turnos").select("*").order("nome")
supabase.from("escalas")
  .select("id,data,auxiliar_id,turno_id,codigo_especial")
  .eq("tipo_escala", "mensal")
  .gte("data", startDate).lte("data", endDate)

// Na geração automática
supabase.from("restricoes").select("auxiliar_id,turno_id,data_inicio,data_fim")
supabase.from("ausencias")
  .select("auxiliar_id,codigo,data_inicio,data_fim")
  .lte("data_inicio", endOfMonth).gte("data_fim", startOfMonth)

// Guardar célula
supabase.from("escalas").update(payload).eq("id", id)   // existente
supabase.from("escalas").insert(payload).select("id")    // novo

// Apagar (batch de 50)
supabase.from("escalas").delete().in("id", [...ids])
```

---

## ⚡ Realtime

```typescript
// Canal mensal
const channel = supabase.channel(`mensal-live-${year}-${month}`)
// Trigger: qualquer alteração em escalas (tipo_escala='mensal', data no mês)
// Acção: fetchAll()
```

---

## 🔗 Ver Também

- [[16 - Algoritmo de Geração]] — Algoritmo coverage-first completo
- [[17 - Sistema de Alertas]] — calcularAlertas() detalhado
- [[20 - PDF e Exportação]] — exportPDF, printEscala, shareWA
- [[18 - Códigos Especiais]] — D, F, Fe, FAA, L, Aci
- [[21 - Configurações LocalStorage]] — cfg_horarios
