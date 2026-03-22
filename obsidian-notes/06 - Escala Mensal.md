---
tags: [escala-mensal, geração, alertas, pdf, equipas]
updated: 2026-03-22
---

# 06 — Escala Mensal

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/EscalaMensal.tsx` (~68 KB / ~1300 linhas)

## 🎯 O Que Faz

Página principal do sistema. Mostra a escala do mês completo num calendário tabular:
- **Linhas:** auxiliares **agrupados por equipa** (Equipa 1 / Equipa 2 / Equipa Transportes) — ver [[25 - Equipas de Auxiliares]]
- **Colunas:** dias do mês
- **Células:** turno atribuído ou código especial ([[18 - Códigos Especiais]])

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
| `openSec` | Record\<string,boolean\> | Secções de alertas expandidas |
| `resolvidoBanner` | number | Nº de alertas recentemente resolvidos |

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

- [[25 - Equipas de Auxiliares]] — Agrupamento por equipa (groupedAuxiliares)
- [[16 - Algoritmo de Geração]] — Algoritmo coverage-first completo
- [[17 - Sistema de Alertas]] — calcularAlertas() detalhado
- [[20 - PDF e Exportação]] — exportPDF, printEscala, shareWA
- [[18 - Códigos Especiais]] — D, F, Fe, FAA, L, Aci
- [[21 - Configurações LocalStorage]] — cfg_horarios
- [[07 - Escala Semanal]] — Sincronização bidirecional RT
- [[08 - Auxiliares]] — Fonte dos auxiliares com campo equipa
