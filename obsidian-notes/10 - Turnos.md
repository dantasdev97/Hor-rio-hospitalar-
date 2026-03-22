---
tags: [turnos, shifts, cores, postos, classificação]
updated: 2026-03-22
---

# 10 — Turnos

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Turnos.tsx`

## 🎯 O Que Faz

CRUD de turnos de trabalho. Define os turnos disponíveis no sistema com:
- Código/nome (ex: M7, T21, N5, MT18)
- Horário de início e fim
- Cor personalizada para display
- Postos de trabalho associados
- **Badge visual M/T/N** — mostra em que célula da [[07 - Escala Semanal]] o turno cai

---

## 🏷️ Classificação Automática de Turno (turnoParaLetra)

Ver detalhes completos em [[26 - Classificação M-T-N por Horário]].

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
```

| Resultado | Significado | Badge |
|---|---|---|
| `"M"` | Manhã | Verde `#C6EFCE` |
| `"T"` | Tarde | Amarelo `#FFEB9C` |
| `"N"` | Noite | Azul `#BDD7EE` |
| `"MT"` | Misto | Ciano `#BAE6FD` |
| `null` | Não classificado | — |

```typescript
const LETRA_STYLE = {
  M:  { bg: "#C6EFCE", color: "#276221", label: "Manhã"  },
  T:  { bg: "#FFEB9C", color: "#9C6500", label: "Tarde"  },
  N:  { bg: "#BDD7EE", color: "#1F497D", label: "Noite"  },
  MT: { bg: "#BAE6FD", color: "#0369A1", label: "Misto"  },
}
```

---

## 🎨 Paleta de Cores Predefinida

O sistema tem 11 cores predefinidas para escolher no form:

| Cor | Hex |
|---|---|
| Azul | `#3B82F6` |
| Verde | `#22C55E` |
| Amarelo | `#EAB308` |
| Rosa | `#EC4899` |
| Índigo | `#6366F1` |
| Laranja | `#F97316` |
| Vermelho | `#EF4444` |
| Roxo | `#A855F7` |
| Ciano | `#06B6D4` |
| Lima | `#84CC16` |
| Cinzento | `#6B7280` |

> Se `cor = null`, cores derivadas automaticamente por `deriveTurnoColor()` — ver [[06 - Escala Mensal]]

---

## 📦 Estado

| State | Tipo | Propósito |
|---|---|---|
| `turnos` | Turno[] | Lista de turnos |
| `loading` | boolean | A carregar |
| `dialogOpen` | boolean | Modal aberto |
| `editing` | Turno\|null | Turno em edição |
| `selectedColor` | string | Cor seleccionada |
| `selectedPostos` | string[] | Postos seleccionados |

---

## ✅ Validação (Zod)

```typescript
const schema = z.object({
  nome: z.string().min(1, "Código é obrigatório"),
  horario_inicio: z.string().min(1, "Horário de início é obrigatório"),
  horario_fim: z.string().min(1, "Horário de fim é obrigatório"),
})
```

---

## 🔧 Funções

| Função | O Que Faz |
|---|---|
| `fetchTurnos()` | SELECT * FROM turnos ORDER BY nome |
| `openNew()` | Abre modal de criação (reset cor + postos) |
| `openEdit(t)` | Abre modal com dados pré-preenchidos |
| `togglePosto(key)` | Adiciona/remove posto do array selectedPostos |
| `onSubmit(data)` | INSERT ou UPDATE turno |
| `handleDelete(id)` | DELETE com confirmação |

---

## 📊 Queries Supabase

```typescript
supabase.from("turnos").select("*").order("nome")
supabase.from("turnos").insert({ nome, horario_inicio, horario_fim, cor, postos })
supabase.from("turnos").update({ nome, horario_inicio, horario_fim, cor, postos }).eq("id", id)
supabase.from("turnos").delete().eq("id", id)
```

---

## 🖥️ UI

### Tabela
- **Código** — badge com cor do turno
- **Horário** — HH:MM início → HH:MM fim
- **Célula Semanal** — badge M/T/N/MT (verde/amarelo/azul/ciano) — novo
- **Postos** — lista de postos associados
- **Ações** — Editar / Apagar

### Dialog
- Campo: Código (obrigatório)
- Campos: Horário início + fim (grid 2 colunas)
- Selector de cor (paleta visual 11 cores com preview)
- Checkboxes de postos (grid 2 colunas, 8 opções) — ver [[19 - Postos e Turnos]]

---

## 🔗 Ver Também

- [[26 - Classificação M-T-N por Horário]] — Lógica de `turnoParaLetra` e badges
- [[19 - Postos e Turnos]] — POSTOS disponíveis e regras
- [[07 - Escala Semanal]] — Como os turnos são usados nos postos
- [[12 - VincularTurnoPosto]] — Interface alternativa de vinculação
- [[05 - Tipos TypeScript]] — Interface Turno
