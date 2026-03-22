---
tags: [auxiliares, crud, staff]
updated: 2026-03-21
---

# 08 — Auxiliares

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Auxiliares.tsx`

## 🎯 O Que Faz

CRUD completo dos auxiliares de radiologia. Ponto de entrada para gestão de:
- Dados pessoais (nome, email, nº mecanográfico, NIF)
- Estado de disponibilidade
- Permissão de trabalho ao fim de semana
- Ausências (via [[14 - AuxDrawer]])

---

## 📦 Estado

| State | Tipo | Propósito |
|---|---|---|
| `auxiliares` | Auxiliar[] | Lista completa |
| `loading` | boolean | A carregar |
| `dialogOpen` | boolean | Modal criar/editar |
| `editing` | Auxiliar\|null | Auxiliar em edição (null = novo) |
| `search` | string | Filtro por nome/email/nº mec |
| `filter` | "all"\|"available"\|"unavailable" | Filtro de disponibilidade |
| `drawerAux` | Auxiliar\|null | Auxiliar no AuxDrawer |

---

## ✅ Validação (Zod)

```typescript
const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")),
  numero_mecanografico: z.string().optional(),
  contribuinte: z.string().optional(),
})
```

---

## 🔧 Funções

| Função | O Que Faz |
|---|---|
| `fetchAuxiliares()` | SELECT * FROM auxiliares ORDER BY nome |
| `openNew()` | Abre modal para criar novo auxiliar |
| `openEdit(aux)` | Abre modal com dados pré-preenchidos |
| `onSubmit(data)` | INSERT ou UPDATE conforme `editing` |
| `handleDelete(id)` | DELETE com confirmação |
| `toggleDisponivel(aux)` | UPDATE disponivel = !atual |
| `handleAuxUpdated(updated)` | Actualiza estado local após drawer |

---

## 📊 Queries Supabase

```typescript
// Fetch
supabase.from("auxiliares").select("*").order("nome")

// Criar
supabase.from("auxiliares").insert({ nome, email, numero_mecanografico, contribuinte })

// Editar
supabase.from("auxiliares").update({ nome, email, numero_mecanografico, contribuinte }).eq("id", id)

// Apagar
supabase.from("auxiliares").delete().eq("id", id)

// Toggle disponível
supabase.from("auxiliares").update({ disponivel: !aux.disponivel }).eq("id", id)
```

---

## 🖥️ UI

- **Header:** título + pills (X disponíveis / X indisponíveis) + botão "Adicionar"
- **Filtros:** barra de pesquisa + toggle (Todos / Disponíveis / Indisponíveis)
- **Tabela:**
  - Coluna: Nome
  - Coluna: Email
  - Coluna: Nº Mec.
  - Coluna: Contribuinte (NIF)
  - Coluna: Disponível (toggle badge verde/cinzento)
  - Coluna: FDS (ícone + sim/não)
  - Coluna: Acções (Editar / Apagar)
- **Clique no nome** → abre [[14 - AuxDrawer]]

---

## 🔗 Ver Também

- [[14 - AuxDrawer]] — Gestão detalhada de ausências
- [[05 - Tipos TypeScript]] — Interface Auxiliar
- [[04 - Base de Dados]] — Tabela auxiliares
