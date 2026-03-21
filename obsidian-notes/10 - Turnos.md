---
tags: [turnos, shifts, cores, postos]
updated: 2026-03-21
---

# 10 — Turnos

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Turnos.tsx`

## 🎯 O Que Faz

CRUD de turnos de trabalho. Define os turnos disponíveis no sistema com:
- Código/nome (ex: M1, T2, N5, MT_TAC)
- Horário de início e fim
- Cor personalizada para display
- Postos de trabalho associados

---

## 🏷️ Classificação Automática de Turno

| Condição | Letra | Tipo |
|---|---|---|
| `horario_inicio >= "20:00"` OU `nome.startsWith("N")` | N | Nocturno |
| `nome.startsWith("M")` | M | Manhã |
| `nome.startsWith("T")` | T | Tarde |
| `nome.startsWith("MT")` | — | Especial (não classifica) |

---

## 🎨 Paleta de Cores Predefinida

O sistema tem 11 cores predefinidas para escolher no form:

| Cor | Hex | Label |
|---|---|---|
| Azul | `#3B82F6` | Azul |
| Verde | `#22C55E` | Verde |
| Amarelo | `#EAB308` | Amarelo |
| Rosa | `#EC4899` | Rosa |
| Índigo | `#6366F1` | Índigo |
| Laranja | `#F97316` | Laranja |
| Vermelho | `#EF4444` | Vermelho |
| Roxo | `#A855F7` | Roxo |
| Ciano | `#06B6D4` | Ciano |
| Lima | `#84CC16` | Lima |
| Cinzento | `#6B7280` | Cinzento |

> Se `cor = null`, as cores são derivadas automaticamente por `deriveTurnoColor()` → ver [[06 - Escala Mensal]]

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

- **Tabela:** Código (badge com cor), Horário (HH:MM), Postos (lista), Acções
- **Dialog:**
  - Campo: Código (texto obrigatório)
  - Campos: Horário início + fim (grid 2 colunas)
  - Selector de cor (paleta visual com preview)
  - Checkboxes de postos (grid 2 colunas, 8 opções)

---

## 🔗 Ver Também

- [[19 - Postos e Turnos]] — POSTOS disponíveis
- [[07 - Escala Semanal]] — Como turnos são usados nos postos
- [[12 - VincularTurnoPosto]] — Interface alternativa de vinculação
