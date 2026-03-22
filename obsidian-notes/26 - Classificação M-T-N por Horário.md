---
tags: [turnos, classificação, horario, semanal, restricoes]
updated: 2026-03-22
---

# 26 — Classificação M/T/N por Horário

> [[00 - MOC (Índice)|← Índice]]
> Implementado: 2026-03-22

## 🎯 O Que É

A função `turnoToLetra` / `turnoParaLetra` determina em que **célula da [[07 - Escala Semanal]]** um [[10 - Turnos|turno]] é colocado: `M` (Manhã), `T` (Tarde) ou `N` (Noite).

Esta classificação é **crítica** — erra aqui e o auxiliar aparece na célula errada na escala semanal e as [[11 - Restrições]] ficam mal aplicadas.

---

## 🧠 Lógica de Classificação (versão melhorada)

Usada em 3 ficheiros:
- `src/pages/EscalaSemanal.tsx` — `turnoToLetra()`
- `src/pages/Restricoes.tsx` — `turnoParaLetra()`
- `src/pages/Turnos.tsx` — `turnoParaLetra()` (para badge visual)
- `src/pages/VincularTurnoPosto.tsx` — `turnoParaLetra()` (para badge visual)

```typescript
function turnoToLetra(t: { nome: string; horario_inicio: string }): TurnoLetra | null {
  const n = t.nome.toUpperCase().trim()
  const h = (t.horario_inicio ?? "").slice(0, 5)  // "HH:MM"

  // MT* = misto (Manhã+Tarde) → não pode ser atribuído a célula única
  if (n.startsWith("MT")) return null

  // Prefixo N = sempre nocturno (override explícito)
  if (n.startsWith("N")) return "N"

  // Classificação por horário (verdade primária)
  if (h) {
    if (h >= "20:00") return "N"               // 20:00–23:59 → Noite
    if (h > "" && h < "06:00") return "N"      // 00:00–05:59 → Noite (meia-noite)
    if (h >= "06:00" && h < "14:00") return "M" // 06:00–13:59 → Manhã
    if (h >= "14:00" && h < "20:00") return "T" // 14:00–19:59 → Tarde
  }

  // Fallback por prefixo do nome (quando horário não resolve)
  if (n.startsWith("M")) return "M"
  if (n.startsWith("T")) return "T"

  return null
}
```

---

## 📐 Tabela de Classificação

| `horario_inicio` | Letra | Tipo |
|---|---|---|
| `>= "20:00"` | **N** | Noite (início em hora normal nocturna) |
| `< "06:00"` (e `> ""`) | **N** | Noite (turno que atravessa meia-noite) |
| `>= "06:00"` e `< "14:00"` | **M** | Manhã |
| `>= "14:00"` e `< "20:00"` | **T** | Tarde |
| Prefixo `MT*` | **null** | Misto — não classifica |
| Prefixo `N*` | **N** | Override explícito |
| Fallback `M*` | **M** | Pelo nome |
| Fallback `T*` | **T** | Pelo nome |

---

## 🔄 Comparação: Antes vs Depois

| Aspecto | Versão Antiga | Versão Nova |
|---|---|---|
| Classificação N | Só `>= "20:00"` | `>= "20:00"` **ou** `< "06:00"` |
| Classificação M/T | Só por prefixo nome | Horário como primário, nome como fallback |
| Turnos sem prefixo M/T/N | Retornavam `null` | Classificados pelo horário se possível |
| Turnos `00:00–05:59` | Classificados incorrectamente | Agora → N (nocturno) |

---

## 🎨 Badges Visuais (Turnos e VincularTurnoPosto)

```typescript
const LETRA_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  M:  { bg: "#C6EFCE", color: "#276221", label: "Manhã"  },  // verde
  T:  { bg: "#FFEB9C", color: "#9C6500", label: "Tarde"  },  // amarelo
  N:  { bg: "#BDD7EE", color: "#1F497D", label: "Noite"  },  // azul
  MT: { bg: "#BAE6FD", color: "#0369A1", label: "Misto"  },  // ciano
}
```

Visíveis em:
- [[10 - Turnos]] — coluna **"Célula Semanal"** na tabela de turnos
- [[12 - VincularTurnoPosto]] — coluna **"Célula"** na matriz turno×posto

Exemplo de badge: `M (Manhã)` a verde, `T (Tarde)` a amarelo, `N (Noite)` a azul.

---

## ⚙️ Impacto nas Restrições

Em [[11 - Restrições]], a função `turnoParaLetra` é usada para:
1. **Mapear turnos para letras** na matriz combinada Posto × Turno
2. **Validar restrições** quando se tenta atribuir um aux a uma célula

Se um turno for mal classificado → a restrição é aplicada na célula errada → erro silencioso.

---

## ⚠️ Casos Especiais

| Caso | Comportamento |
|---|---|
| `horario_inicio = null` ou `""` | Usa fallback por nome |
| `nome = "MT18"` | → `null` (misto, não vai a nenhuma célula sozinho) |
| `nome = "N5"`, `horario = "21:00"` | → `N` (prefixo N confirma) |
| `nome = "M7"`, `horario = "08:00"` | → `N` não, `M` porque h `< 14:00` |
| `nome = "M7"`, `horario = "16:00"` | → `T` pelo horário (sobrepõe nome M!) |

> ⚠️ O último caso mostra que o horário tem prioridade sobre o nome. Se o utilizador criar um turno com nome "M7" mas horário 16:00, será classificado como Tarde. Configurar correctamente os horários é essencial.

---

## 🔗 Ver Também

- [[07 - Escala Semanal]] — Uso de `turnoToLetra` na geração e edição
- [[10 - Turnos]] — CRUD e badge visual M/T/N
- [[12 - VincularTurnoPosto]] — Badge visual M/T/N na matriz
- [[11 - Restrições]] — Impacto nas restrições por turno
- [[19 - Postos e Turnos]] — Regras por posto e turno
- [[23 - Histórico Git]] — Commit desta melhoria
