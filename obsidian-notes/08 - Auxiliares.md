---
tags: [auxiliares, crud, staff, equipas]
updated: 2026-03-22
---

# 08 — Auxiliares

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Auxiliares.tsx`

## 🎯 O Que Faz

CRUD completo dos auxiliares de radiologia. Gestão de:
- Dados pessoais (nome, email, nº mecanográfico, NIF)
- Estado de disponibilidade e permissão FDS
- **Equipa** (Equipa 1, Equipa 2, Equipa Transportes) — ver [[25 - Equipas de Auxiliares]]
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
| `drawerAux` | Auxiliar\|null | Auxiliar no [[14 - AuxDrawer]] |
| `selectedEquipa` | EquipaType\|null | Equipa seleccionada no modal |

---

## ✅ Validação (Zod)

```typescript
const EQUIPAS = ['Equipa 1', 'Equipa 2', 'Equipa Transportes'] as const
type EquipaType = typeof EQUIPAS[number]

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")),
  numero_mecanografico: z.string().optional(),
  contribuinte: z.string().optional(),
  equipa: z.enum(['Equipa 1', 'Equipa 2', 'Equipa Transportes']).nullable().optional(),
})
```

---

## 🔧 Funções

| Função | O Que Faz |
|---|---|
| `fetchAuxiliares()` | SELECT * FROM auxiliares ORDER BY nome |
| `openNew()` | Abre modal limpo; reset `selectedEquipa = null` |
| `openEdit(aux)` | Pré-preenche form incl. `selectedEquipa = aux.equipa` |
| `onSubmit(data)` | INSERT ou UPDATE com `equipa: selectedEquipa` |
| `handleDelete(id)` | DELETE com confirmação |
| `toggleDisponivel(aux)` | UPDATE disponivel = !atual |
| `handleAuxUpdated(updated)` | Actualiza estado local após [[14 - AuxDrawer]] |

---

## 📊 Queries Supabase

```typescript
// Fetch
supabase.from("auxiliares").select("*").order("nome")

// Criar (inclui equipa)
supabase.from("auxiliares").insert({
  nome, email, numero_mecanografico, contribuinte,
  equipa: selectedEquipa   // null | 'Equipa 1' | 'Equipa 2' | 'Equipa Transportes'
})

// Editar (inclui equipa)
supabase.from("auxiliares").update({
  nome, email, numero_mecanografico, contribuinte, equipa: selectedEquipa
}).eq("id", id)

// Apagar
supabase.from("auxiliares").delete().eq("id", id)

// Toggle disponível
supabase.from("auxiliares").update({ disponivel: !aux.disponivel }).eq("id", id)
```

---

## 🖥️ UI

### Tabela

| Coluna | Descrição |
|---|---|
| Nome | Com avatar inicial; clique → [[14 - AuxDrawer]] |
| Email | — |
| Nº Mec. | Número mecanográfico |
| Contribuinte | NIF |
| Disponível | Toggle badge verde/vermelho |
| FDS | Badge azul/cinzento |
| Ações | Editar / Apagar |

### Modal Criar/Editar

1. **Nome** (obrigatório)
2. **Email** (opcional)
3. **Nº Mecanográfico** (opcional)
4. **NIF / Contribuinte** (opcional)
5. **Equipa** — dropdown `<select>`:
   - "Sem equipa" → `null`
   - "Equipa 1"
   - "Equipa 2"
   - "Equipa Transportes"

---

## 🔗 Ver Também

- [[25 - Equipas de Auxiliares]] — Campo equipa, agrupamento na escala mensal
- [[14 - AuxDrawer]] — Gestão detalhada de ausências
- [[06 - Escala Mensal]] — Auxiliares agrupados por equipa
- [[05 - Tipos TypeScript]] — Interface Auxiliar com campo equipa
- [[04 - Base de Dados]] — Tabela auxiliares e migração equipa
- [[11 - Restrições]] — Restrições por auxiliar
