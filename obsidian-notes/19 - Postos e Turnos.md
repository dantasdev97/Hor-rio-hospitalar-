---
tags: [postos, turnos, regras, classificação, multi-pessoa]
updated: 2026-03-22
---

# 19 — Postos e Turnos

> [[00 - MOC (Índice)|← Índice]]

## 🏢 Os 8 Postos (POSTOS)

```typescript
const POSTOS = [
  { key: "RX_URG",    label: "RX URG" },
  { key: "TAC2",      label: "TAC 2" },
  { key: "TAC1",      label: "TAC 1" },
  { key: "EXAM1",     label: "ECO URG / Exames Comp. (1)" },
  { key: "EXAM2",     label: "ECO Complementar / Exames Comp. (2)" },
  { key: "SALA6",     label: "SALA 6 BB" },
  { key: "SALA7",     label: "SALA 7 EXT" },
  { key: "TRANSPORT", label: "Transportes INT/URG" },
]
```

> EXAM1 = "ECO URG", EXAM2 = "ECO Complementar" (labels actualizados)

---

## ⏰ Regras de Funcionamento (POSTO_SCHEDULE)

| Posto | Turnos | Dias de Semana | Fim de Semana |
|---|---|---|---|
| RX_URG | M, T, N | ✅ | ✅ |
| TAC2 | M, T, N | ✅ | ✅ |
| EXAM1 | M, T, N | ✅ | ✅ |
| EXAM2 | M, T | ✅ seg–sáb | ✅ sábado |
| TRANSPORT | M, T | ✅ | ✅ |
| TAC1 | M, T | ✅ seg–sáb | ✅ sábado |
| SALA6 | M | ✅ | ✅ |
| SALA7 | M, T | ✅ | ✅ |

> Domingo: apenas RX_URG, TAC2, EXAM1, TRANSPORT (e SALA6 só M)

---

## 🩺 Tipo de Pessoa por Posto × Turno

| Condição | Tipo |
|---|---|
| EXAM1 no turno N | [[09 - Doutores\|Doutor]] |
| EXAM2 no turno N | [[09 - Doutores\|Doutor]] |
| Todos os outros | [[08 - Auxiliares\|Auxiliar]] |

---

## 🔡 Letras de Turno (M/T/N)

Classificação feita por `turnoToLetra()` — ver [[26 - Classificação M-T-N por Horário]].

| Letra | Tipo | Critério (por prioridade) |
|---|---|---|
| `N` | Noite | Prefixo `N*` **ou** `horario_inicio >= "20:00"` **ou** `< "06:00"` |
| `M` | Manhã | `horario_inicio >= "06:00"` e `< "14:00"` (ou fallback prefixo `M*`) |
| `T` | Tarde | `horario_inicio >= "14:00"` e `< "20:00"` (ou fallback prefixo `T*`) |
| — | Misto | Prefixo `MT*` → não classifica (null) |

---

## 🎨 Cores por Tipo de Turno

| Tipo | Cor Fundo | Cor Texto | Uso |
|---|---|---|---|
| N | `#BDD7EE` (azul) | `#1F497D` | PDF semanal, cabeçalhos, badges |
| M | `#C6EFCE` (verde) | `#276221` | PDF semanal, cabeçalhos, badges |
| T | `#FFEB9C` (amarelo) | `#9C6500` | PDF semanal, cabeçalhos, badges |
| MT | `#BAE6FD` (ciano) | `#0369A1` | Badge em [[10 - Turnos]] e [[12 - VincularTurnoPosto]] |

---

## 👥 Máximo de Pessoas por Célula

| Posto + Turno | Máximo | Tipo | Fix |
|---|---|---|---|
| TRANSPORT + M | 2 | Auxiliar | [[27 - Fix ECO URG Multi-Pessoa\|Fix aplicado]] |
| EXAM1 + M | 2 | Auxiliar | [[27 - Fix ECO URG Multi-Pessoa\|Fix aplicado]] |
| EXAM1 + T | 2 | Auxiliar | [[27 - Fix ECO URG Multi-Pessoa\|Fix aplicado]] |
| EXAM2 + M | 3 | Auxiliar | [[27 - Fix ECO URG Multi-Pessoa\|Fix aplicado]] |
| Todos os outros | 1 | Auxiliar ou Doutor | — |

> As células multi-pessoa derivadas do mensal tinham bug de limpeza — corrigido em [[27 - Fix ECO URG Multi-Pessoa]]

---

## 🔗 Ver Também

- [[07 - Escala Semanal]] — Uso dos postos na escala semanal
- [[10 - Turnos]] — CRUD de turnos e badge M/T/N
- [[12 - VincularTurnoPosto]] — Vincular turnos a postos
- [[11 - Restrições]] — Restrições por posto
- [[26 - Classificação M-T-N por Horário]] — Lógica de classificação turno → célula
- [[27 - Fix ECO URG Multi-Pessoa]] — Fix células multi-pessoa (EXAM1/TRANSPORT)
