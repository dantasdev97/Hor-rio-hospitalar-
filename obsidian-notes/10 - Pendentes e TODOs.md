# Pendentes e TODOs

> Bugs conhecidos, features pedidas e melhorias identificadas.
> Última actualização: 2026-03-21

---

## Bugs Conhecidos

### B1 — Turno N5 não detetado como noturno
**Estado:** Corrigido mas revertido a pedido do utilizador
**Commit:** `e8f1e04` (revertido em `29206c8`)
**Causa:** `isNoturnoTurno()` verificava `horario_inicio >= "20:00"` antes do nome. Se o turno N5 tiver `horario_inicio` incorreto na BD, falha.
**Solução identificada:** Priorizar nome "N..." antes do horário.
**Branch:** `claude/fix-auxdrawer-duplicate-property-Wtf9X`

---

### B2 — Cowork não funciona
**Estado:** Não investigado
**Descrição:** O utilizador reportou que não consegue usar a funcionalidade "cowork".
**Ficheiro provável:** `EscalaSemanal.tsx`
**Próximo passo:** Identificar onde `cowork` é mencionado no código e depurar.

---

## Features a Implementar

### F1 — Detecção de Postos sem Cobertura (além de EXAM1 e N)
**Prioridade:** Média
**Descrição:** Actualmente só são verificados turno N (2 pessoas) e EXAM1 (M e T). Os outros postos (TAC1, TAC2, SALA6, SALA7, TRANSPORT, EXAM2) não têm verificação de cobertura na escala mensal.
**Abordagem:** Usar `POSTO_SCHEDULE` da `EscalaSemanal.tsx` para saber quais postos precisam de cobertura em cada turno/dia e verificar se o turno atribuído ao auxiliar inclui esse posto.

---

### F2 — Alertas de Excesso de Auxiliares na Escala Semanal
**Prioridade:** Baixa
**Descrição:** Detectar quando há mais auxiliares atribuídos a um posto/turno do que o máximo configurado.
**Ficheiro:** `EscalaSemanal.tsx`

---

### F3 — Limite Mínimo de Turnos Configurável
**Prioridade:** Baixa
**Descrição:** O mínimo de 15 turnos/mês para o alerta de "subcarregado" está hard-coded. Deveria ser exposto nas Configurações (`cfg_horarios`).
**Ficheiro:** `EscalaMensal.tsx` linha ~445 + `Configuracoes.tsx`

---

## Melhorias Técnicas

### T1 — RLS Supabase para Produção
**Prioridade:** Alta (antes de ir para produção real)
**Descrição:** As políticas RLS actuais são `allow_all` (modo desenvolvimento). Em produção real devem ser restritas por `auth.uid()` e roles.
**Ficheiro:** `supabase/migrations/`

---

### T2 — PT-PT Consistente
**Prioridade:** Baixa
**Descrição:** Alguns textos ainda em português do Brasil ou misto:
- `"cadastrado"` → `"registado"` (2 locais em `EscalaMensal.tsx`)
- `"Baixar PDF"` → `"Transferir PDF"` (botão)
- `"Enviando..."` → `"A enviar..."` (botão WhatsApp)
- Mensagem de imagem descarregada no WhatsApp
**Nota:** Estas alterações foram implementadas no commit `e8f1e04` mas revertidas.

---

### T3 — `horario_inicio` / `horario_fim` Nulos no Modal
**Prioridade:** Média
**Descrição:** O modal de célula faz `.slice(0,5)` em `t.horario_inicio` e `t.horario_fim` sem verificar se são null. Se um turno estiver mal configurado na BD, crasha.
**Ficheiro:** `EscalaMensal.tsx` linha ~1230

---

## Histórico de Sessões Claude

| Data | O que foi feito |
|------|----------------|
| 2026-03-21 | Sistema de alertas dinâmico com interface `AlertaMensal`, `useMemo`, secções colapsáveis, banner de resolvidos |
| 2026-03-21 | Fix `isNoturnoTurno` (N5 bug) + detecção de subcarregados + PT-PT → revertido a pedido |
| 2026-03-21 | Criação destas notas Obsidian |

---

## Notas Relacionadas

- [[06 - Lógica de Escalas]]
- [[09 - Erros e Alertas]]

#todos #bugs #features #backlog
