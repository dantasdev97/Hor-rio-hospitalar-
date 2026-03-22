---
tags: [restrições, restrictions, bloqueios, classificação]
updated: 2026-03-22
---

# 11 — Restrições

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Restricoes.tsx`

## 🎯 O Que Faz

Define restrições que impedem um [[08 - Auxiliares|auxiliar]] de trabalhar num determinado [[10 - Turnos|turno]] e/ou [[19 - Postos e Turnos|posto]].

Tipos de restrição:
- **Por turno** — aux não pode fazer o turno X
- **Por posto** — aux não pode trabalhar no posto Y
- **Combinada** — aux não pode fazer turno X no posto Y
- **Temporizada** — só activa entre `data_inicio` e `data_fim`

---

## 📦 Estado

| State | Tipo | Propósito |
|---|---|---|
| `restricoes` | Restricao[] | Lista completa |
| `auxiliares` | Auxiliar[] | Para dropdowns |
| `turnos` | Turno[] | Para dropdowns |
| `loading` | boolean | A carregar |
| `dialogOpen` | boolean | Modal criar/editar |
| `editing` | Restricao\|null | Em edição |

---

## ✅ Validação (Zod)

```typescript
const schema = z.object({
  auxiliar_id: z.string().min(1, "Auxiliar é obrigatório"),
  turno_id: z.string().optional(),
  posto: z.string().optional(),
  motivo: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
})
```

---

## 🔧 Funções

| Função | O Que Faz |
|---|---|
| `fetchAll()` | Carrega restricoes + auxiliares + turnos |
| `onSubmit(data)` | INSERT ou UPDATE restrição |
| `handleDelete(id)` | DELETE com confirmação |

---

## 🏷️ turnoParaLetra (usado na UI)

A função `turnoParaLetra` mostra em que célula M/T/N cai cada turno nas dropdowns:

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

> Ver explicação completa em [[26 - Classificação M-T-N por Horário]]

---

## 📊 Queries Supabase

```typescript
// Fetch
supabase.from("restricoes").select("*")
supabase.from("auxiliares").select("*").order("nome")
supabase.from("turnos").select("*").order("nome")

// Criar
supabase.from("restricoes").insert({ auxiliar_id, turno_id, posto, motivo, data_inicio, data_fim })

// Editar
supabase.from("restricoes").update({ ... }).eq("id", id)

// Apagar
supabase.from("restricoes").delete().eq("id", id)
```

---

## ⚙️ Aplicação das Restrições

As restrições são verificadas em:
1. [[07 - Escala Semanal]] — antes de atribuir um aux a uma célula
2. [[16 - Algoritmo de Geração]] — durante a geração automática mensal

Lógica de verificação:
```typescript
function temRestricao(
  restricoes: Restricao[],
  auxId: string,
  turnoId: string,
  posto: string,
  data: string
): boolean {
  return restricoes.some(r => {
    if (r.auxiliar_id !== auxId) return false
    if (r.data_inicio && data < r.data_inicio) return false
    if (r.data_fim && data > r.data_fim) return false
    const matchTurno = !r.turno_id || r.turno_id === turnoId
    const matchPosto = !r.posto || r.posto === posto
    return matchTurno && matchPosto
  })
}
```

---

## 🔗 Ver Também

- [[08 - Auxiliares]] — Auxiliares com restrições
- [[10 - Turnos]] — Turnos usados nas restrições
- [[19 - Postos e Turnos]] — Postos disponíveis
- [[26 - Classificação M-T-N por Horário]] — `turnoParaLetra` nas dropdowns
- [[07 - Escala Semanal]] — Aplicação das restrições na escala
- [[16 - Algoritmo de Geração]] — Aplicação durante geração automática
