---
tags: [todos, bugs, features, pendentes]
updated: 2026-03-22
---

# 24 — Pendentes e TODOs

> [[00 - MOC (Índice)|← Índice]]

## 🐛 Bugs Conhecidos

### B1 — Turno N5 não detectado como noturno ⚠️ PARCIALMENTE CORRIGIDO
- **Estado:** Fix `e8f1e04` revertido; mas [[26 - Classificação M-T-N por Horário]] resolve pelo `horario_inicio`
- **Situação actual:** `turnoToLetra` usa `horario_inicio` como primário — se N5 tiver `horario_inicio >= "20:00"`, é classificado correctamente como N sem depender do prefixo
- **Risco residual:** Se o N5 estiver configurado com horário < 20:00 no Supabase, pode ainda falhar
- **Prioridade:** Média — verificar configuração do horário do N5 na DB

### B2 — Cowork não funciona
- **Estado:** Não investigado
- **Prioridade:** Baixa

---

## ✅ Corrigido Recentemente (2026-03-22)

### C1 — ECO URG (EXAM1) células multi-pessoa não limpavam ✅
- **Corrigido em:** [[27 - Fix ECO URG Multi-Pessoa]]
- `clearEscala` agora apaga também entradas mensais derivadas
- `hasExisting` detecta derivações mensais (IDs `"mensal_*"`)
- `saveEscala` com seleção vazia delega para `clearEscala`

### C2 — Badge M/T/N ausente em Turnos e VincularTurnoPosto ✅
- **Corrigido em:** [[26 - Classificação M-T-N por Horário]]
- Coluna "Célula Semanal" adicionada à tabela de [[10 - Turnos]]
- Coluna "Célula" adicionada à matriz [[12 - VincularTurnoPosto]]

---

## 🚀 Features a Implementar

### F1 — Deteção de Cobertura para Todos os Postos
- **Estado:** Pendente
- **Descrição:** Alerta de cobertura (cat. B) só verifica N (RX URG + TAC2). EXAM1 tem verificação parcial. Os outros 5 postos sem verificação.
- **Prioridade:** Média
- **Ver:** [[17 - Sistema de Alertas]]

### F2 — Alerta de Excesso na Escala Semanal
- **Estado:** Pendente
- **Prioridade:** Baixa

### F3 — Mínimo de Turnos Configurável
- **Estado:** Pendente
- **Fix simples:** Adicionar `minTurnosMes: 15` ao `DEFAULT_CFG` em [[21 - Configurações LocalStorage]]
- **Prioridade:** Baixa

---

## 🔧 Melhorias Técnicas

### T1 — RLS Supabase para Produção
- **Estado:** Pendente — **ALTA PRIORIDADE** para produção real
- Ver [[04 - Base de Dados]] — políticas RLS

### T2 — Linguagem PT-PT Consistente
- **Estado:** Pendente
- **Prioridade:** Baixa

### T3 — Campos Null em horario_inicio/horario_fim
- **Estado:** Pendente
- Pode crashar modal de edição de célula na [[07 - Escala Semanal]]
- **Prioridade:** Média

---

## 💡 Ideias Futuras

### I1 — Gestão de Férias Anuais
### I2 — Relatórios / Dashboard de horas por auxiliar
### I3 — Notificações Email/SMS
### I4 — Exportação para Excel

---

## 📋 Log de Sessões

| Data | O Que Foi Feito |
|---|---|
| 2026-03-21 | [[17 - Sistema de Alertas\|Sistema de alertas]] dinâmico implementado |
| 2026-03-21 | Fix N5 → revertido a pedido |
| 2026-03-21 | Notas Obsidian v1 criadas |
| 2026-03-21 | Notas Obsidian v2 — análise profunda de todo o sistema |
| 2026-03-22 | [[25 - Equipas de Auxiliares\|Campo equipa]] adicionado aos auxiliares + agrupamento [[06 - Escala Mensal\|escala mensal]] |
| 2026-03-22 | [[26 - Classificação M-T-N por Horário\|Badge M/T/N]] em [[10 - Turnos\|Turnos]] e [[12 - VincularTurnoPosto\|VincularTurnoPosto]] |
| 2026-03-22 | [[27 - Fix ECO URG Multi-Pessoa\|Fix ECO URG]] — limpeza de células multi-pessoa |
| 2026-03-22 | Notas Obsidian v3 — links completos, 3 novas notas (25/26/27) |

---

## 🔗 Ver Também

- [[17 - Sistema de Alertas]] — Estado actual dos alertas
- [[16 - Algoritmo de Geração]] — Estado da geração automática
- [[23 - Histórico Git]] — Commits relacionados
- [[25 - Equipas de Auxiliares]] — Feature de equipas (concluída)
- [[26 - Classificação M-T-N por Horário]] — Fix classificação (concluído)
- [[27 - Fix ECO URG Multi-Pessoa]] — Fix multi-pessoa (concluído)
