---
tags: [git, histórico, commits, desenvolvimento]
updated: 2026-03-21
---

# 23 — Histórico Git

> [[00 - MOC (Índice)|← Índice]]

## 🌿 Branches

| Branch | Propósito |
|---|---|
| `main` | Produção (Vercel) |
| `master` | (existente mas não activo) |
| `claude/fix-auxdrawer-duplicate-property-Wtf9X` | Branch de desenvolvimento activo |

---

## 📅 Fases de Desenvolvimento

### Fase 1 — Sistema Base
```
d769b83  feat: implementação completa do sistema de gestão de horários hospitalares
```
Implementação inicial completa.

### Fase 2 — CRUD e Restrições
```
29fa245  novas atualizações para auxiliares, config restrições
4ed61c3  feat: adiciona funcionalidades de PDF, impressão e compartilhamento WhatsApp
```

### Fase 3 — Deploy e Config
```
20c6482  config: adiciona configuração de deploy Vercel
3423fb6  fix: remove env secrets from vercel.json
4216a17  chore: trigger vercel redeploy with latest updates
6d758f4  chore: trigger vercel redeploy - branch main
685af72  fix: aumentar chunkSizeWarningLimit para 2000 KB
```

### Fase 4 — Escala Semanal (Postos)
```
9b9d45b  fix: resolve TS1117 duplicate property error in AuxDrawer
59fd5c0  fix: corrigir 9 falhas na geração de escalas mensal e semanal
3588d0a  feat: vincular turnos a postos + escala semanal automática
ba42224  feat: sync bidirecional RT + fix 404 + restrições visuais
c71a6e1  Adicionar regras de postos + fix restrições combinadas + matriz posto×turno
a3f1db8  Regras de escala: sem turno duplicado, 2 noturnos/dia, TRANSPORT+M duplo, primeiros nomes
```

### Fase 5 — Funcionalidades Avançadas Semanal
```
324ce80  feat: coverage-first generation + dialog filter tabs
21bd66e  feat(semanal): bloqueios operacionais no modal + feedback
4f8f447  feat: tratamento de erros, remoção e validações nas escalas
fdef030  fix: aux com trabalha_fds=false não recebem Folga automática em dias úteis
06fb5e2  feat: filtro alocados hoje, sync semanal→mensal, avisos config-aware, geração 2×N5
54bfff6  fix: corrigir replicação de auxiliar em múltiplos postos na EscalaSemanal
ceaec5d  fix: 2×N5 — RX URG e TAC2 mostram auxiliar diferente na EscalaSemanal
f6eafd7  feat: EXAM1 aceita 2 aux, EXAM2+N aceita até 3 aux, campos N com nome completo
6a57303  feat: EXAM1+N e EXAM2+N mostram lista de Doutores; EXAM2+M aceita até 3 aux
a2cf190  feat: troca TAC2/TAC1, labels Eco Urg/Eco Complementar, botão Limpar multi-select
```

### Fase 6 — PDF e Exportação
```
705de3a  feat: redesign PDF export — layout moderno, cores da imagem, uma página A4
3caccbe  fix: PDF em branco — passar string HTML directamente ao html2pdf
20023a9  feat: migrar PDF de html2pdf.js para jsPDF + autoTable
aa556a2  feat: redesign PDF fiel à imagem de referência da empresa
0377c7f  fix: cores exactas da imagem de referência, tipografia melhorada, 1 página
0f16b3d  fix: PDF 1 página + print UX + migração PDF mensal para jsPDF
```

### Fase 7 — Alertas
```
616dddb  feat: sistema de alertas dinâmico e assertivo na escala mensal
e8f1e04  fix(alertas): corrigir deteção de turno N5 e melhorar alertas de carga
29206c8  Revert "fix(alertas): corrigir deteção de turno N5 e melhorar alertas de carga"
```

> ⚠️ `e8f1e04` foi revertido a pedido (bug N5 na detecção de noturno — ver [[24 - Pendentes e TODOs]])

### Fase 8 — Documentação
```
a1ccd14  docs: adicionar notas Obsidian com contexto completo do projecto
```

---

## 🔗 Ver Também

- [[24 - Pendentes e TODOs]] — O que ficou pendente
- [[01 - Visão Geral]] — Estado actual do projecto
