---
tags: [componente, auxdrawer, ausências, calendário]
updated: 2026-03-21
---

# 14 — AuxDrawer

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/components/AuxDrawer.tsx` (~27 KB)

## 🎯 O Que Faz

Painel lateral (drawer) com 2 steps para gestão detalhada de um auxiliar:
- **Step 1:** Registo de ausências com calendário de range
- **Step 2:** Perfil completo + estatísticas de ausências

---

## 🧩 Props

```typescript
{
  aux: Auxiliar                         // Auxiliar a visualizar
  onClose: () => void                   // Fechar drawer
  onUpdated: (a: Auxiliar) => void      // Callback após edição
  onAusenciaSaved?: () => void          // Callback após guardar ausência
}
```

---

## 📦 Estado

| State | Tipo | Propósito |
|---|---|---|
| `step` | 1 \| 2 | Step activo do drawer |
| `ausencias` | Ausencia[] | Lista de ausências do auxiliar |
| `ausLoading` | boolean | A carregar ausências |
| `selCode` | string\|null | Código de ausência seleccionado |
| `dateStart` | string | Data início da ausência |
| `dateEnd` | string | Data fim da ausência |
| `saving` | boolean | A guardar |
| `deleting` | string\|null | ID a apagar |
| `fdsToggling` | boolean | A alterar flag FDS |
| `filterCode` | string\|null | Filtro activo na lista |
| `page` | number | Página actual (paginação) |

---

## 🔧 Sub-Componente: `RangeCal`

Calendário interactivo para selecção de range de datas.

```typescript
Props: {
  startDate: string   // Data início seleccionada
  endDate: string     // Data fim seleccionada
  onChange: (start: string, end: string) => void
}

State:
  vy: number          // Ano visualizado
  vm: number          // Mês visualizado (0-11)
  phase: "start"|"end"  // A seleccionar início ou fim
  hover: string       // Data em hover para preview
```

**Funções:**
- `prevMonth()` / `nextMonth()` — navega meses
- `ds(d)` — formata YYYY-MM-DD
- `handleClick(d)` — lógica de selecção início/fim

---

## 🔧 Funções Principais

### `fetchAus()`
```typescript
supabase.from("ausencias")
  .select("*")
  .eq("auxiliar_id", aux.id)
  .order("data_inicio", { ascending: false })
```

### `saveAusencia()`
1. Valida: código + datas obrigatórios
2. INSERT em `ausencias` (codigo, data_inicio, data_fim)
3. DELETE escalas mensal no range (para este auxiliar)
4. INSERT escalas mensal com `codigo_especial` para cada dia do range
5. Callback `onAusenciaSaved()` para refetch na página pai

### `deleteAusencia(aus)`
1. DELETE from `ausencias`
2. DELETE escalas mensal correspondentes (range de datas)

### `toggleFds()`
```typescript
supabase.from("auxiliares")
  .update({ trabalha_fds: !aux.trabalha_fds })
  .eq("id", aux.id)
```

---

## 📊 Dados Derivados (Memoized)

| Derivação | Cálculo |
|---|---|
| `filtered` | ausencias filtradas por filterCode |
| `paginated` | slice de filtered por PAGE_SIZE (10) |
| `stats` | Map de código → total de dias |
| `totalAusenciaDias` | Soma de Fe + FAA + L + Aci |
| `nextAus` | Próxima ausência futura |

---

## 🎨 Step 1 — Ausências

- Toggle "Trabalha FDS" (switch)
- Selector de código (D, F, Fe, FAA, L, Aci — como chips)
- Calendário RangeCal para seleccionar período
- Botão "Guardar"
- Últimas 3 ausências em preview

## 👤 Step 2 — Perfil

- Cards: Nº Mecanográfico, NIF/Contribuinte, Disponibilidade, FDS
- Resumo estatístico (dias por código)
- Tabela paginada de todas as ausências com filtros por código
- Botão apagar por ausência

---

## 📋 Constantes

```typescript
const PAGE_SIZE = 10

const SPECIAL = [
  { code: "D",   label: "Descanso",         bg: "#D1D5DB", text: "#374151" },
  { code: "F",   label: "Folga",            bg: "#F3F4F6", text: "#6B7280" },
  { code: "Fe",  label: "Comp. Feriado",    bg: "#86EFAC", text: "#14532D" },
  { code: "FAA", label: "Férias Ano Ant.",  bg: "#FCA5A5", text: "#7F1D1D" },
  { code: "L",   label: "Licença",          bg: "#DDD6FE", text: "#4C1D95" },
  { code: "Aci", label: "Acidente Trab.",   bg: "#A5F3FC", text: "#164E63" },
]
```

---

## 🔗 Ver Também

- [[18 - Códigos Especiais]] — Códigos D, F, Fe, FAA, L, Aci
- [[08 - Auxiliares]] — Onde o AuxDrawer é aberto
- [[06 - Escala Mensal]] — Como as ausências afectam a escala mensal
