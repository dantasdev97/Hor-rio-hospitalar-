# Códigos Especiais

> Códigos usados nas células da escala mensal para marcar ausências e estados especiais.
> Definidos em `src/pages/EscalaMensal.tsx` no array `SPECIAL`.

---

## Tabela de Códigos

| Código | Label | Cor de Fundo | Cor de Texto | Significa |
|--------|-------|-------------|-------------|-----------|
| **D** | Descanso | `#D1D5DB` (cinza) | `#374151` | Descanso obrigatório após turno noturno |
| **F** | Folga | `#F3F4F6` (cinza claro) | `#6B7280` | Folga — dia de descanso planeado |
| **Fe** | Comp. Feriado | `#86EFAC` (verde) | `#14532D` | Compensação de feriado trabalhado |
| **FAA** | Férias Ano Anterior | `#FCA5A5` (vermelho claro) | `#7F1D1D` | Férias de ano anterior |
| **L** | Licença | `#DDD6FE` (roxo) | `#4C1D95` | Licença / baixa médica |
| **Aci** | Acidente Trabalho | `#A5F3FC` (ciano) | `#164E63` | Acidente de trabalho |

---

## Códigos de Ausência Real

Os códigos **L**, **Aci**, **FAA** e **Fe** são considerados "ausências reais" — o auxiliar não está disponível e o posto precisa de cobertura alternativa.

```typescript
const ABSENCE_TIPOS = ["L", "Aci", "FAA", "Fe"]
```

Os códigos **D** e **F** são descanso/folga planeados — não geram alertas de cobertura.

---

## Mapeamento para Alertas

Quando um destes códigos é detetado, o sistema gera um alerta `info` na secção "Ausências":

```typescript
const ABSENCE_LABEL: Record<string, string> = {
  L:   "licença / baixa médica",
  Aci: "acidente de trabalho",
  FAA: "férias (ano anterior)",
  Fe:  "folga por feriado",
  F:   "folga",
  D:   "descanso",
}
```

---

## Como Aplicar um Código

1. Na escala mensal, clicar na célula do auxiliar no dia pretendido
2. Modal abre com secção "Ocorrências"
3. Seleccionar o código pretendido
4. Clicar "Guardar"

---

## Limpeza do Mês

Ao clicar "Limpar" na escala mensal, os registos com código **Fe**, **FAA**, **L**, **Aci** são **preservados**. Apenas turnos e F/D são apagados.

```typescript
const ABSENCE_CODES = new Set(["Fe", "FAA", "L", "Aci"])
// Estes não são apagados no limpar
```

---

## Notas Relacionadas

- [[02 - Base de Dados]] — tabela `ausencias` e campo `codigo_especial` em `escalas`
- [[09 - Erros e Alertas]] — alertas gerados por estes códigos

#códigos #ausências #folga #descanso
