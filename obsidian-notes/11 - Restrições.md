---
tags: [restrições, restrictions, bloqueios]
updated: 2026-03-21
---

# 11 — Restrições

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Restricoes.tsx`

## 🎯 O Que Faz

Gestão de restrições por auxiliar. Uma restrição impede que um auxiliar seja escalado num determinado turno, posto, ou combinação, num período de datas definido.

---

## 📋 Tipos de Restrição

| Tipo | `turno_id` | `posto` | Comportamento |
|---|---|---|---|
| **Só por turno** | ✅ preenchido | null | Auxiliar não pode fazer aquele turno |
| **Só por posto** | null | ✅ preenchido | Auxiliar não pode ir a aquele posto |
| **Combinada** | ✅ | ✅ | Auxiliar não pode fazer aquele turno naquele posto |

---

## 📅 Restrições Temporárias vs Permanentes

| Campo | null | Preenchido |
|---|---|---|
| `data_inicio` | Sem limite de início | Começa nesta data |
| `data_fim` | Sem limite de fim | Termina nesta data |

---

## 🔧 Lógica de Verificação (EscalaSemanal)

```typescript
// auxTemRestricao(auxId, posto, turnoLetra, date)
// 1. Filtra restricoes por auxiliar_id = auxId
// 2. Verifica se data está dentro do range (data_inicio, data_fim)
// 3. Verifica match:
//    - Se turno_id preenchido: converte para letra (M/T/N) e compara
//    - Se posto preenchido: compara com o posto da célula
//    - Combinada: ambos têm de fazer match
```

### Texto de Restrição para UI
```typescript
// getRestricaoDescricao() retorna:
"este posto (RX URG)"           // só posto
"este turno (M)"                // só turno
"este posto (TAC2) neste turno (N)"  // combinada
```

---

## 📊 Queries Supabase

```typescript
// Fetch
supabase.from("restricoes").select("id,auxiliar_id,turno_id,posto,motivo,data_inicio,data_fim")

// Criar
supabase.from("restricoes").insert({ auxiliar_id, turno_id, posto, motivo, data_inicio, data_fim })

// Apagar
supabase.from("restricoes").delete().eq("id", id)
```

---

## 🖥️ UI

- **Tabela:** Auxiliar, Turno, Posto, Motivo, Período, Acções
- **Dialog:** Dropdown auxiliar + dropdown turno (opcional) + dropdown posto (opcional) + campo motivo + datas início/fim
- **Validação:** Pelo menos turno OU posto deve ser preenchido

---

## 🔗 Ver Também

- [[07 - Escala Semanal]] — Onde as restrições são aplicadas
- [[16 - Algoritmo de Geração]] — Restrições na geração mensal
- [[19 - Postos e Turnos]] — Postos disponíveis
