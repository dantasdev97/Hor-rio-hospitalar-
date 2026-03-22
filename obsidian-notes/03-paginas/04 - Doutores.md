---
tags: [doutores, médicos, crud]
updated: 2026-03-21
---

# 09 — Doutores

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Doutores.tsx`

## 🎯 O Que Faz

CRUD de médicos e gestão dos turnos associados a cada médico.
Os médicos são escalados nos postos EXAM1 e EXAM2 no turno N (nocturno) via [[07 - Escala Semanal]].

---

## 📦 Estado

| State | Tipo | Propósito |
|---|---|---|
| `doutores` | Doutor[] | Lista de médicos |
| `turnos` | Turno[] | Lista de turnos disponíveis |
| `doutorTurnos` | DoutorTurno[] | Associações médico ↔ turno |
| `loading` | boolean | A carregar |
| `dialogOpen` | boolean | Modal criar/editar médico |
| `turnosDialogOpen` | boolean | Modal de gestão de turnos |
| `editing` | Doutor\|null | Médico em edição |
| `selectedDoutor` | Doutor\|null | Médico seleccionado para gerir turnos |
| `selectedTurnoId` | string | Turno a adicionar |

---

## ✅ Validação (Zod)

```typescript
const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  numero_mecanografico: z.string().optional(),
})
```

---

## 🔧 Funções

| Função | O Que Faz |
|---|---|
| `fetchAll()` | Fetch paralelo: doutores + turnos + doutor_turnos (com join) |
| `getTurnosForDoutor(id)` | Filtra doutorTurnos → retorna Turno[] |
| `openNew()` | Abre modal de criação |
| `openEdit(d)` | Abre modal com dados pré-preenchidos |
| `onSubmit(data)` | INSERT ou UPDATE doutor |
| `handleDelete(id)` | DELETE doutor |
| `openTurnosDialog(d)` | Abre modal de gestão de turnos |
| `addTurnoToDoutor()` | INSERT doutor_turnos (com verificação de duplicados) |
| `removeTurnoFromDoutor(id)` | DELETE doutor_turnos |

---

## 📊 Queries Supabase

```typescript
// Fetch (paralelo)
supabase.from("doutores").select("*").order("nome")
supabase.from("turnos").select("*").order("horario_inicio")
supabase.from("doutor_turnos").select("*, turno:turnos(*)")  // join

// CRUD médico
supabase.from("doutores").insert({ nome, numero_mecanografico })
supabase.from("doutores").update({ nome, numero_mecanografico }).eq("id", id)
supabase.from("doutores").delete().eq("id", id)

// Gestão de turnos
supabase.from("doutor_turnos").insert({ doutor_id, turno_id })
supabase.from("doutor_turnos").delete().eq("id", doutorTurnoId)
```

---

## 🖥️ UI

- **Tabela:** Nome, Nº Mecanográfico, Turnos (badges), Acções
- **Dialog 1:** Formulário de médico (nome + nº mecanográfico)
- **Dialog 2 (Turnos):** Dropdown de turnos + botão Adicionar + lista com botões Remover

---

## 🔗 Ver Também

- [[07 - Escala Semanal]] — Como médicos são escalados (EXAM1/EXAM2 + N)
- [[10 - Turnos]] — Turnos disponíveis
- [[05 - Tipos TypeScript]] — Interfaces Doutor, DoutorTurno
