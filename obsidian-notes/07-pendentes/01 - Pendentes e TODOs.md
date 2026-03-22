---
tags: [todos, bugs, features, pendentes]
updated: 2026-03-22
---

# 24 — Pendentes e TODOs

> [[00 - MOC (Índice)|← Índice]]

## 🐛 Bugs Conhecidos

### B1 — Turno N5 não detectado como noturno
- **Estado:** Corrigido no commit `e8f1e04`, **revertido** a pedido no `29206c8`
- **Problema:** O turno "N5" não era reconhecido como nocturno pela função `isNoturnoTurno()`
- **Fix aplicado (revertido):** Adicionar check `nome.startsWith("N")` explícito para N5
- **Causa do revert:** O utilizador pediu reverter (pode ter causado outro comportamento)
- **Prioridade:** Alta — afecta a geração automática de D+F e os alertas de cobertura

### B2 — Cowork não funciona
- **Estado:** Não investigado
- **Problema:** Funcionalidade de "cowork" está referenciada mas não funciona
- **Prioridade:** Baixa — não é funcionalidade crítica

---

## 🚀 Features a Implementar

### F1 — Deteção de Cobertura para Todos os Postos
- **Estado:** Pendente
- **Descrição:** O alerta de cobertura (categoria B) apenas verifica N (RX URG + TAC2).
  EXAM1 tem verificação parcial (categoria C).
  Os outros 5 postos (TAC1, EXAM2, SALA6, SALA7, TRANSPORT) não têm verificação.
- **Prioridade:** Média

### F2 — Alerta de Excesso na Escala Semanal
- **Estado:** Pendente
- **Descrição:** Detectar quando há auxiliares em excesso na escala semanal (mais do que o máximo para um posto)
- **Prioridade:** Baixa

### F3 — Mínimo de Turnos Configurável
- **Estado:** Pendente
- **Descrição:** O valor mínimo de 15 turnos/mês (alerta G - subcarregado) está hard-coded.
  Deveria ser uma configuração em `cfg_horarios`.
- **Localização:** `calcularAlertas()` em EscalaMensal.tsx
- **Fix simples:** Adicionar `minTurnosMes: 15` ao `DEFAULT_CFG` e `HorariosConfig`
- **Prioridade:** Baixa

---

## 🔧 Melhorias Técnicas

### T1 — RLS Supabase para Produção
- **Estado:** Parcialmente resolvido (tabelas `configuracoes` e `perfil_coordenador` têm `allow_all` como as restantes)
- **Prioridade:** Alta — segurança
- **Descrição:** Todas as tabelas têm `allow_all`. Para produção real deve-se implementar políticas por `auth.uid()`
- **O que fazer:**
  ```sql
  -- Exemplo para auxiliares
  CREATE POLICY "Users can see own data" ON auxiliares
  FOR ALL USING (auth.uid() IS NOT NULL);
  ```

### T2 — Linguagem PT-PT Consistente
- **Estado:** Pendente
- **Prioridade:** Baixa
- **Descrição:** Alguns textos ainda usam português do Brasil (ex: "cadastrado" em vez de "registado", "você" em vez de "você/tu")
- **Exemplos encontrados:** mensagens de validação Zod, alguns toasts

### T3 — Campos Null em horario_inicio/horario_fim
- **Estado:** Pendente
- **Prioridade:** Média
- **Descrição:** O modal de edição de célula pode crashar se `horario_inicio` ou `horario_fim` forem null no objecto Turno
- **Fix:** Adicionar null-check em `restHoursBetween()` e nas funções de display

---

## 💡 Ideias Futuras

### I1 — Gestão de Férias Anuais
- Calendário de férias com slots por mês
- Verificação automática de cobertura durante férias

### I2 — Relatórios / Dashboard
- Total de horas por auxiliar por mês
- Gráfico de distribuição de turnos

### I3 — Sistema de Notificações
- Email/SMS quando escala é gerada
- Aviso ao auxiliar quando tem turno nocturno

### I4 — Exportação para Excel
- Alternativa ao PDF para edição posterior

---

## 📋 Log de Sessões

| Data | O Que Foi Feito |
|---|---|
| 2026-03-21 | Sistema de alertas dinâmico implementado |
| 2026-03-21 | Fix N5 → revertido a pedido |
| 2026-03-21 | Notas Obsidian v1 criadas |
| 2026-03-21 | Notas Obsidian v2 — análise profunda de todo o sistema |
| 2026-03-22 | Configurações migradas para BD (tabelas `configuracoes` + `perfil_coordenador`) |
| 2026-03-22 | ConfigContext criado — empresa, horários e perfil partilhados globalmente |
| 2026-03-22 | Sidebar: logo dinâmica + modal de perfil do coordenador |
| 2026-03-22 | EscalaMensal e EscalaSemanal usam `useConfig()` em vez de localStorage |
| 2026-03-22 | Redesign visual das 3 tabs de Configurações (gradientes, ícones, layout polido) |
| 2026-03-22 | **⚠️ Pendente:** Executar migração SQL no Supabase Dashboard (tabelas `configuracoes` + `perfil_coordenador`) |

---

## 🔗 Ver Também

- [[17 - Sistema de Alertas]] — Estado actual dos alertas
- [[16 - Algoritmo de Geração]] — Estado da geração automática
- [[23 - Histórico Git]] — Commits relacionados
