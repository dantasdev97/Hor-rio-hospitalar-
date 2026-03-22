---
tags: [moc, índice, projeto]
updated: 2026-03-22
---

# 🗺️ Horário Hospitalar — Mapa do Conhecimento

> Sistema de gestão de escalas para o departamento de Imagiologia do Hospital Leiria CHL.
> **Em produção** via Vercel. Branch `main` = produção.

---

## 📌 Estado do Projeto

| Item | Detalhe |
|---|---|
| **Versão** | 0.0.0 (em desenvolvimento activo) |
| **Deploy** | Vercel — branch `main` |
| **Branch dev** | `claude/fix-auxdrawer-duplicate-property-Wtf9X` |
| **Supabase** | RLS allow_all (modo dev) |
| **Último commit** | `46ecd6c` — fix: corrigir limpeza ECO URG células multi-pessoa |

---

## 🧭 Navegação Rápida

### 🏗️ Projecto & Arquitectura
- [[01 - Visão Geral]] — Stack, deploy, variáveis de ambiente
- [[02 - Arquitectura e Estrutura]] — Pastas, ficheiros críticos, fluxo de dados
- [[03 - Rotas e Navegação]] — Todas as rotas, guards, sidebar

### 🗄️ Base de Dados
- [[04 - Base de Dados]] — Schema completo, tabelas, relações, RLS
- [[05 - Tipos TypeScript]] — Todas as interfaces e tipos

### 📄 Páginas
- [[06 - Escala Mensal]] — Motor principal, geração automática, alertas
- [[07 - Escala Semanal]] — Vista por postos, sincronização, regras
- [[08 - Auxiliares]] — CRUD, disponibilidade, FDS, equipas
- [[09 - Doutores]] — CRUD, associação de turnos
- [[10 - Turnos]] — CRUD, cores, postos associados, badge M/T/N
- [[11 - Restrições]] — Tipos, lógica, datas
- [[12 - VincularTurnoPosto]] — Matriz turno × posto, badge M/T/N
- [[13 - Configurações]] — LocalStorage, validações, empresa

### 🧩 Componentes & Lógica
- [[14 - AuxDrawer]] — Painel lateral, ausências, calendário range
- [[15 - Autenticação]] — AuthContext, SignIn, SignOut, guards
- [[16 - Algoritmo de Geração]] — Coverage-first, distribuição justa
- [[17 - Sistema de Alertas]] — 7 categorias, gravidade, UI colapsável
- [[18 - Códigos Especiais]] — D, F, Fe, FAA, L, Aci
- [[19 - Postos e Turnos]] — 8 postos, regras por dia/turno, multi-pessoa

### 📤 Exportação
- [[20 - PDF e Exportação]] — jsPDF, print, WhatsApp, html2canvas

### ⚙️ Configuração & Dev
- [[21 - Configurações LocalStorage]] — cfg_empresa, cfg_horarios, defaults
- [[22 - Dependências]] — Todas as packages e versões
- [[23 - Histórico Git]] — Commits, fases de desenvolvimento

### 📋 Trabalho Pendente
- [[24 - Pendentes e TODOs]] — Bugs, features, melhorias técnicas

### 🆕 Features Recentes (2026-03-22)
- [[25 - Equipas de Auxiliares]] — Campo equipa, agrupamento na escala mensal
- [[26 - Classificação M-T-N por Horário]] — `turnoToLetra` melhorado, badges visuais
- [[27 - Fix ECO URG Multi-Pessoa]] — Limpeza e troca de aux em células EXAM1/TRANSPORT

---

## 🔗 Links Externos

- [Supabase Dashboard](https://supabase.com) — Base de dados
- [Vercel Dashboard](https://vercel.com) — Deploy
- [Repositório GitHub](https://github.com/dantasdev97/Hor-rio-hospitalar-)

---

## 📊 Visão Rápida do Sistema

```
Login → Escala Mensal ← → Escala Semanal
         ↓                      ↓
    Equipas (1, 2, TR)     Postos M/T/N
    Gerar Escala           Editar por Posto
    Alertas                Sincronização RT
    PDF/Print/WA           PDF/Print/WA
         ↓
    AuxDrawer (ausências)
    Restrições
    Configurações
```

---

## 🔗 Mapa de Dependências (principais)

```
Auxiliares ──equipa──→ Escala Mensal (grupos)
Turnos ─────postos───→ Escala Semanal (células M/T/N)
Escala Mensal ←──── sync RT ────→ Escala Semanal
Restrições ──────────────────────→ Escala Semanal (bloqueios)
AuxDrawer ←──────────────────────  Auxiliares (click nome)
```
