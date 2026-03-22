---
tags: [códigos, ausências, especiais, folga, descanso]
updated: 2026-03-21
---

# 18 — Códigos Especiais

> [[00 - MOC (Índice)|← Índice]]

## 📋 Tabela Completa

| Código | Label | Cor Fundo | Cor Texto | Origem | Preservado na Limpeza |
|---|---|---|---|---|---|
| `D` | Descanso | `#D1D5DB` | `#374151` | Automático (pós-noturno) | ❌ |
| `F` | Folga | `#F3F4F6` | `#6B7280` | Automático (sem turno) | ❌ |
| `Fe` | Comp. Feriado | `#86EFAC` | `#14532D` | Manual (AuxDrawer) | ✅ |
| `FAA` | Férias Ano Anterior | `#FCA5A5` | `#7F1D1D` | Manual (AuxDrawer) | ✅ |
| `L` | Licença | `#DDD6FE` | `#4C1D95` | Manual (AuxDrawer) | ✅ |
| `Aci` | Acidente de Trabalho | `#A5F3FC` | `#164E63` | Manual (AuxDrawer) | ✅ |

---

## 📖 Descrição Detalhada

### `D` — Descanso
- **Quando:** Automaticamente atribuído no dia seguinte a um turno nocturno (N)
- **Regra:** N no dia X → D no dia X+1 → F no dia X+2
- **Alerta:** Se seguido de M ou T → erro "< 11h descanso"
- **Limpeza:** Apagado na limpeza/reset da escala

### `F` — Folga
- **Quando:** Automaticamente atribuído a auxiliares sem turno atribuído naquele dia
- **Também:** Atribuído 2 dias após noturno (pós-D)
- **Limpeza:** Apagado na limpeza/reset da escala

### `Fe` — Compensação de Feriado
- **Quando:** Registado manualmente no [[14 - AuxDrawer]]
- **Alerta:** Gera info "Fe" no sistema de alertas
- **Limpeza:** **Preservado** — não é apagado na limpeza

### `FAA` — Férias Ano Anterior
- **Quando:** Registado manualmente no [[14 - AuxDrawer]]
- **Alerta:** Gera info "FAA" no sistema de alertas
- **Limpeza:** **Preservado** — não é apagado na limpeza

### `L` — Licença / Baixa Médica
- **Quando:** Registado manualmente no [[14 - AuxDrawer]]
- **Alerta:** Gera info "L" no sistema de alertas
- **Limpeza:** **Preservado** — não é apagado na limpeza

### `Aci` — Acidente de Trabalho
- **Quando:** Registado manualmente no [[14 - AuxDrawer]]
- **Alerta:** Gera info "Aci" no sistema de alertas
- **Limpeza:** **Preservado** — não é apagado na limpeza

---

## 🗄️ Onde São Guardados

Na tabela `escalas`, campo `codigo_especial` (tipo_escala = 'mensal').

```typescript
// Exemplo de registo
{
  data: "2026-03-15",
  tipo_escala: "mensal",
  auxiliar_id: "uuid-auxiliar",
  turno_id: null,               // null quando é código especial
  codigo_especial: "L"
}
```

---

## 🔗 Ver Também

- [[14 - AuxDrawer]] — Interface para registar Fe, FAA, L, Aci
- [[17 - Sistema de Alertas]] — Como os códigos geram alertas
- [[16 - Algoritmo de Geração]] — Como D e F são gerados automaticamente
- [[06 - Escala Mensal]] — getSpecialColor(), função de cores
