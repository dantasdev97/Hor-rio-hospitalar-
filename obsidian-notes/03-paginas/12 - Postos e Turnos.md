---
tags: [postos, turnos, regras, classificação]
updated: 2026-03-21
---

# 19 — Postos e Turnos

> [[00 - MOC (Índice)|← Índice]]

## 🏢 Os 8 Postos (POSTOS)

```typescript
const POSTOS = [
  { key: "RX_URG",    label: "RX URG" },
  { key: "TAC2",      label: "TAC 2" },
  { key: "TAC1",      label: "TAC 1" },
  { key: "EXAM1",     label: "Exames Comp. (1)" },
  { key: "EXAM2",     label: "Exames Comp. (2)" },
  { key: "SALA6",     label: "SALA 6 BB" },
  { key: "SALA7",     label: "SALA 7 EXT" },
  { key: "TRANSPORT", label: "Transportes INT/URG" },
]
```

---

## ⏰ Regras de Funcionamento (POSTO_SCHEDULE)

| Posto | Turnos | Dias de Semana | Fim de Semana |
|---|---|---|---|
| RX_URG | M, T, N | ✅ | ✅ |
| TAC2 | M, T, N | ✅ | ✅ |
| EXAM1 | M, T, N | ✅ | ✅ |
| EXAM2 | M, T | ✅ seg-sáb | ✅ sábado |
| TRANSPORT | M, T | ✅ | ✅ |
| TAC1 | M, T | ✅ seg-sáb | ✅ sábado |
| SALA6 | M | ✅ | ✅ |
| SALA7 | M, T | ✅ | ✅ |

> Domingo: apenas RX_URG, TAC2, EXAM1, TRANSPORT funcionam (e SALA6 só M)

---

## 🩺 Tipo de Pessoa por Posto × Turno

| Condição | Tipo |
|---|---|
| EXAM1 no turno N | Doutor |
| EXAM2 no turno N | Doutor |
| Todos os outros | Auxiliar |

---

## 🔡 Letras de Turno

| Letra | Tipo | Critério |
|---|---|---|
| `N` | Nocturno | `horario_inicio >= "20:00"` OU `nome.startsWith("N")` |
| `M` | Manhã | `nome.startsWith("M")` |
| `T` | Tarde | `nome.startsWith("T")` |
| — | Especial | `nome.startsWith("MT")` → não classifica |

---

## 🎨 Cores por Tipo de Turno

| Tipo | Cor Fundo | Cor Texto |
|---|---|---|
| N | #BDD7EE (azul) | — |
| M | #C6EFCE (verde) | — |
| T | #FFC000 (amarelo) | — |

> Estas cores são usadas no PDF semanal e nos cabeçalhos da grelha.

---

## 👥 Máximo de Pessoas por Célula

| Posto + Turno | Máximo | Tipo |
|---|---|---|
| TRANSPORT + M | 2 | Auxiliar |
| EXAM1 + M | 2 | Auxiliar |
| EXAM1 + T | 2 | Auxiliar |
| EXAM2 + M | 3 | Auxiliar |
| Todos os outros | 1 | Auxiliar ou Doutor |

---

## 🔗 Ver Também

- [[07 - Escala Semanal]] — Uso dos postos na escala semanal
- [[10 - Turnos]] — CRUD de turnos
- [[12 - VincularTurnoPosto]] — Vincular turnos a postos
- [[11 - Restrições]] — Restrições por posto
