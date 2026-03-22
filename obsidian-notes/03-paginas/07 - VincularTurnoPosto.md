---
tags: [turnos, postos, vinculação, matriz]
updated: 2026-03-21
---

# 12 — VincularTurnoPosto

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/VincularTurnoPosto.tsx`

## 🎯 O Que Faz

Interface de matriz para vincular turnos a postos de trabalho.
- Alternativa visual à interface de checkboxes em [[10 - Turnos]]
- Cada toggle actualiza imediatamente `turnos.postos[]` no Supabase

---

## 📊 Estrutura da Matriz

```
           | RX_URG | TAC1 | TAC2 | EXAM1 | EXAM2 | SALA6 | SALA7 | TRANSPORT
-----------|--------|------|------|-------|-------|-------|-------|----------
M1 (08:00) |  [✓]  | [ ]  | [✓]  | [✓]  | [ ]   | [ ]   | [✓]  |  [✓]
T2 (16:00) |  [✓]  | [✓]  | [✓]  | [✓]  | [✓]   | [ ]   | [✓]  |  [✓]
N5 (00:00) |  [✓]  | [ ]  | [✓]  | [ ]  | [ ]   | [ ]   | [ ]  |  [ ]
...
```

---

## 🔧 Comportamento

- **Toggle ON:** Adiciona o posto ao array `turno.postos`
- **Toggle OFF:** Remove o posto do array
- **Auto-save:** Actualização imediata no Supabase (padrão optimista)

---

## 📊 Query Supabase

```typescript
// Fetch
supabase.from("turnos").select("id,nome,horario_inicio,postos").order("nome")

// Toggle
supabase.from("turnos").update({ postos: newPostos }).eq("id", turnoId)
```

---

## 🔗 Ver Também

- [[10 - Turnos]] — CRUD de turnos
- [[19 - Postos e Turnos]] — Lista de postos disponíveis
- [[07 - Escala Semanal]] — Como `turno.postos` é usado na escala semanal
