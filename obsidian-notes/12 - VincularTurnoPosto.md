---
tags: [turnos, postos, vinculação, matriz, classificação]
updated: 2026-03-22
---

# 12 — VincularTurnoPosto

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/VincularTurnoPosto.tsx`

## 🎯 O Que Faz

Interface de matriz para vincular [[10 - Turnos|turnos]] a [[19 - Postos e Turnos|postos]] de trabalho.
- Alternativa visual à interface de checkboxes em [[10 - Turnos]]
- Cada toggle actualiza imediatamente `turnos.postos[]` no Supabase
- **Coluna "Célula"** — mostra badge M/T/N para cada turno — ver [[26 - Classificação M-T-N por Horário]]

---

## 📊 Estrutura da Matriz

```
           | Célula | RX_URG | TAC1 | TAC2 | EXAM1 | EXAM2 | SALA6 | SALA7 | TRANSPORT
-----------|--------|--------|------|------|-------|-------|-------|-------|----------
M7 (08:00) |  [M]  |  [✓]  | [ ]  | [✓]  | [✓]  | [ ]   | [ ]   | [✓]  |  [✓]
T21(16:00) |  [T]  |  [✓]  | [✓]  | [✓]  | [✓]  | [✓]   | [ ]   | [✓]  |  [✓]
N5 (21:00) |  [N]  |  [✓]  | [ ]  | [✓]  | [ ]  | [ ]   | [ ]   | [ ]  |  [ ]
MT18(...)  |  [MT] |  [ ]  | [ ]  | [ ]  | [ ]  | [ ]   | [ ]   | [ ]  |  [ ]
...
```

---

## 🏷️ Badge de Célula Semanal

```typescript
function turnoParaLetra(t: { nome: string; horario_inicio: string }): string | null {
  const n = t.nome.toUpperCase().trim()
  const h = (t.horario_inicio ?? "").slice(0, 5)
  if (n.startsWith("MT")) return "MT"
  if (n.startsWith("N")) return "N"
  if (h >= "20:00" || (h > "" && h < "06:00")) return "N"
  if (h >= "06:00" && h < "14:00") return "M"
  if (h >= "14:00" && h < "20:00") return "T"
  if (n.startsWith("M")) return "M"
  if (n.startsWith("T")) return "T"
  return null
}

const LETRA_STYLE = {
  M:  { bg: "#C6EFCE", color: "#276221", label: "Manhã"  },
  T:  { bg: "#FFEB9C", color: "#9C6500", label: "Tarde"  },
  N:  { bg: "#BDD7EE", color: "#1F497D", label: "Noite"  },
  MT: { bg: "#BAE6FD", color: "#0369A1", label: "Misto"  },
}
```

---

## 🔧 Comportamento

- **Toggle ON:** Adiciona o posto ao array `turno.postos`
- **Toggle OFF:** Remove o posto do array
- **Auto-save:** Actualização imediata no Supabase (padrão optimista)

---

## 📊 Queries Supabase

```typescript
// Fetch (inclui horario_inicio para badge M/T/N)
supabase.from("turnos").select("id,nome,horario_inicio,postos").order("nome")

// Toggle
supabase.from("turnos").update({ postos: newPostos }).eq("id", turnoId)
```

---

## 🔗 Ver Também

- [[26 - Classificação M-T-N por Horário]] — Lógica do badge Célula
- [[10 - Turnos]] — CRUD de turnos (interface alternativa)
- [[19 - Postos e Turnos]] — Lista de postos disponíveis
- [[07 - Escala Semanal]] — Como `turno.postos` é usado na escala semanal
