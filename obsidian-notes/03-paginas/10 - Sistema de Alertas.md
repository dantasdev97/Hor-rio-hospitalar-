---
tags: [alertas, validação, erros, avisos]
updated: 2026-03-21
---

# 17 — Sistema de Alertas

> [[00 - MOC (Índice)|← Índice]]
> Função: `calcularAlertas()` em `src/pages/EscalaMensal.tsx`

## 🎯 O Que É

Sistema de validação em tempo real da escala mensal. Recalcula sempre que `escalas`, `auxiliares`, `turnos` ou o mês mudam. Retorna um array de `AlertaMensal[]`.

---

## 📊 Estrutura de um Alerta

```typescript
type AlertaMensal = {
  id: string        // Chave única para tracking de resoluções
  tipo: 'erro' | 'aviso' | 'info'
  categoria: 'ausencia' | 'cobertura' | 'descanso' | 'excesso'
  mensagem: string
  dia?: number      // Dia do mês onde ocorre
  auxNome?: string  // Nome do auxiliar
}
```

---

## 🔴 Categorias e Regras

### A) Ausências (`categoria: 'ausencia'`, tipo: `info`)

> Informa sobre ausências registadas no mês

| Código | Mensagem gerada |
|---|---|
| `L` | "[Nome] — Licença de DD/MM a DD/MM" |
| `Aci` | "[Nome] — Acidente de Trabalho de DD/MM a DD/MM" |
| `FAA` | "[Nome] — Férias Ano Anterior de DD/MM a DD/MM" |
| `Fe` | "[Nome] — Compensação de Feriado em DD/MM" |

---

### B) Cobertura Nocturna (`categoria: 'cobertura'`)

> Cada dia deve ter **exactamente 2** auxiliares nocturnos (RX URG + TAC 2)

| Situação | Tipo | Mensagem |
|---|---|---|
| 0 nocturnos | `erro` | "Dia DD: sem cobertura nocturna" |
| 1 nocturno | `erro` | "Dia DD: apenas 1 auxiliar nocturno ([nome])" |
| > 2 nocturnos | `aviso` | "Dia DD: [N] auxiliares nocturnos (excesso)" |

---

### C) Cobertura EXAM1 (`categoria: 'cobertura'`)

> EXAM1 precisa de auxiliar no turno M (erro) e T (aviso) nos dias úteis e sábados

| Situação | Tipo | Mensagem |
|---|---|---|
| Sem M em dia útil/sábado | `erro` | "Dia DD (EXAM1): sem auxiliar no turno M" |
| Sem T em dia útil/sábado | `aviso` | "Dia DD (EXAM1): sem auxiliar no turno T" |

---

### D) Fim de Semana (`categoria: 'cobertura'`)

> Auxiliares com `trabalha_fds = false` não podem ser escalados ao sábado/domingo

| Situação | Tipo | Mensagem |
|---|---|---|
| Aux FDS=false escalado ao FDS | `erro` | "DD/MM ([Dia]): [Nome] não trabalha fins de semana" |

---

### E) Descanso Pós-Noturno (`categoria: 'descanso'`)

> Após turno N, o dia seguinte deve ter D e não pode ter M ou T (mínimo 11h descanso)

| Situação | Tipo | Mensagem |
|---|---|---|
| N seguido de M ou T | `erro` | "Dia DD: [Nome] tem noturno e [M/T] no dia seguinte (< 11h descanso)" |

> Configurável via `horasDescansMinimas` em [[21 - Configurações LocalStorage]]

---

### F) Excessos Mensais (`categoria: 'excesso'`)

| Situação | Tipo | Mensagem |
|---|---|---|
| Nocturnos > maxTurnosNoturnosMes | `aviso` | "[Nome]: [N] turnos nocturnos (máx. [X])" |
| Total > maxTurnosMes | `aviso` | "[Nome]: [N] turnos no mês (máx. [X])" |

---

### G) Subcarregado (`categoria: 'excesso'`, tipo: `aviso`)

> Auxiliar com menos de 15 turnos no mês

| Situação | Mensagem |
|---|---|
| Total < 15 | "[Nome]: apenas [N] turnos no mês (mínimo esperado: 15)" |

> ⚠️ O valor 15 está hard-coded (ver [[24 - Pendentes e TODOs]] — feature F3)

---

## 🖥️ UI dos Alertas

- **Secções colapsáveis** por categoria (Ausências / Cobertura / Descanso / Excessos)
- **Borda colorida** por gravidade:
  - `erro` → vermelho
  - `aviso` → amarelo/laranja
  - `info` → azul
- **Banner "N alerta(s) resolvido(s)"** — aparece por 3 segundos quando alertas desaparecem
- **Badge no header** com total de alertas activos

---

## 🔗 Ver Também

- [[06 - Escala Mensal]] — Onde calcularAlertas() vive
- [[18 - Códigos Especiais]] — Códigos que geram alertas de ausência
- [[21 - Configurações LocalStorage]] — maxTurnosMes, maxTurnosNoturnosMes, horasDescansMinimas
- [[24 - Pendentes e TODOs]] — Melhorias pendentes no sistema de alertas
