---
tags: [alertas, validação, erros, avisos, urgência]
updated: 2026-03-25
---

# 17 — Sistema de Alertas (v2 — Unificado)

> [[00 - MOC (Índice)|← Índice]]
> Componente partilhado: `src/components/alerts/AlertPanel.tsx`
> Tipos e constantes: `src/components/alerts/alertTypes.ts`
> Cálculo: `calcularAlertas()` em `EscalaSemanal.tsx` e `EscalaMensal.tsx`

## 🎯 O Que É

Sistema de validação em tempo real para ambas as escalas (semanal + mensal). Usa um **componente partilhado** (`AlertPanel`) e **tipos unificados** (`AlertaUnificado`) para garantir consistência visual e funcional.

---

## 📊 Estrutura de um Alerta

```typescript
type AlertaUnificado = {
  id: string
  severidade: 'vermelho' | 'amarelo' | 'info'
  categoria: 'cobertura_urg' | 'cobertura_geral' | 'descanso'
            | 'excesso_mais' | 'excesso_menos' | 'ausencia' | 'outro'
  mensagem: string
  detalhe?: string
  cellRef?: { data: string; turnoLetra: string; posto?: string; auxiliarId?: string }
  isUrg: boolean
  acao?: { label: string; auxId: string; dia: number }
}
```

---

## 🔴🟡 Classificação URG vs Não-URG

### Postos Urgentes → alerta VERMELHO

| Posto | Turnos | Notas |
|---|---|---|
| RX URG | M, T, N | |
| TAC 2 | M, T, N | |
| EXAM1 (Eco URG) | M, T | Seg–Sáb apenas |
| TRANSPORT (Transp URG) | M, T | Sem turno N |

### Postos Não-Urgentes → alerta AMARELO

| Posto | Turnos | Notas |
|---|---|---|
| TAC 1 | M, T | |
| EXAM2 (Eco complementar) | M, T | |
| SALA 6 | M | |
| SALA 7 EXT | M, T | |

A função `classificarCobertura(posto, turnoLetra)` em `alertTypes.ts` determina automaticamente a severidade e categoria.

---

## 📋 Categorias de Alertas (7 secções)

### 1. Falta de Postos URG (`cobertura_urg`, borda vermelha)
- Postos URG sem auxiliar atribuído
- Turno Noite sem mínimo 2 auxiliares (RX URG + TAC 2)

### 2. Postos sem Auxiliar (`cobertura_geral`, borda amarela)
- Postos não-URG sem auxiliar atribuído

### 3. Violações de Descanso (`descanso`, borda amarela)
- Turno N seguido de M ou T no dia seguinte (< 11h descanso)

### 4. Horas a mais (`excesso_mais`, borda amarela)
- Turnos nocturnos > maxTurnosNoturnosMes
- Total turnos > maxTurnosMes
- Horas > 160h/mês

### 5. Poucas horas (`excesso_menos`, borda azul)
- Horas < 80h/mês

### 6. Ausências Registadas (`ausencia`, borda azul)
- Códigos especiais: L (licença), Aci (acidente), FAA (férias ano anterior), Fe (feriado)
- Auxiliares sem turnos atribuídos

### 7. Outros avisos (`outro`, borda cinza)
- Avisos genéricos, marcáveis como resolvidos com ✓

---

## 🖥️ UI — AlertPanel (Componente Partilhado)

### Header
- Fundo escuro com gradiente (`#1A2E44`)
- 3 contadores: **Urgentes** (vermelho) / **Avisos** (amarelo) / **Info** (azul)

### Filtros
- Pills por tipo: Todos / Urgentes / Avisos / Info
- Filtro por dia (opcional, usado na semanal)

### Secções colapsáveis (accordion)
- Uma secção por categoria com ícone, contagem e seta
- Alertas dentro de cada secção com borda colorida por severidade

### Ícones de Ação por Alerta
- 👁 **Eye** — Localizar na escala (faz piscar a célula correspondente)
- ✕ **X** — Dispensar alerta (local, reset quando dados mudam)
- ✓ **Check** — Marcar como resolvido (apenas categoria `outro`)

### Botão de Ação
- Alertas com `acao` mostram botão (ex: "Alocar substituto")

---

## ✨ Blink (Feedback Visual)

Ao clicar no ícone 👁 de um alerta:
1. `blinkCell` state é preenchido com o `cellRef` do alerta
2. A célula correspondente na tabela recebe animação CSS:
   - `blinkRed` (3x 1s) para alertas URG
   - `blinkYellow` (3x 1s) para alertas não-URG
3. Após 3 segundos, o blink é limpo automaticamente

### Semanal: Cores permanentes nas células vazias
- Células URG vazias: fundo `#FEE2E2` (red-100)
- Células não-URG vazias: fundo `#FEF9C3` (yellow-100)

---

## 🗂️ Texto PT-PT

- Turnos: "Manhã", "Tarde", "Noite" (não "M", "T", "N")
- Mensagens: "Precisa de Auxiliar" (não "Precisa de cobertura")
- Constante `TURNO_FULL` em `alertTypes.ts`

---

## 🔗 Ver Também

- [[06 - Escala Mensal]] — Onde `calcularAlertas()` mensal vive
- [[05 - Escala Semanal]] — Onde `calcularAlertasSemanal()` vive
- [[18 - Códigos Especiais]] — Códigos que geram alertas de ausência
- [[21 - Configurações LocalStorage]] — maxTurnosMes, maxTurnosNoturnosMes
