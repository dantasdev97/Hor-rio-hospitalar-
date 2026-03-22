---
tags: [moc, índice, projeto]
updated: 2026-03-22
---

# Horário Hospitalar — Mapa do Conhecimento

> Sistema de gestão de escalas para o departamento de Imagiologia do Hospital Leiria CHL.
> **Em produção** via Vercel. Branch `main` = produção.

---

## Estado do Projeto

| Item | Detalhe |
|---|---|
| **Versão** | 1.0 |
| **Deploy** | Vercel — https://horariochl.vercel.app |
| **Branch** | `main` = produção |
| **Supabase** | RLS com autenticação obrigatória |
| **Config** | BD (ConfigContext) — não localStorage |

---

## Navegação por Pastas

### 01-arquitectura/
- [[01-arquitectura/01 - Visão Geral]] — Stack, deploy, variáveis de ambiente
- [[01-arquitectura/02 - Arquitectura e Estrutura]] — Pastas, ficheiros críticos, fluxo de dados
- [[01-arquitectura/03 - Rotas e Navegação]] — Rotas, guards, sidebar
- [[01-arquitectura/04 - Dependências]] — Packages e versões

### 02-base-dados/
- [[02-base-dados/01 - Esquema BD]] — Schema completo, tabelas, relações
- [[02-base-dados/02 - Tipos TypeScript]] — Interfaces e tipos
- [[02-base-dados/03 - RLS e Segurança]] — Políticas RLS, migrações

### 03-paginas/
- [[03-paginas/01 - Escala Mensal]] — Motor principal, geração automática, alertas
- [[03-paginas/02 - Escala Semanal]] — Vista por postos, sincronização, regras
- [[03-paginas/03 - Auxiliares]] — CRUD, disponibilidade, FDS
- [[03-paginas/04 - Doutores]] — CRUD, associação de turnos
- [[03-paginas/05 - Turnos]] — CRUD, cores, postos associados
- [[03-paginas/06 - Restrições]] — Tipos, lógica, datas
- [[03-paginas/07 - VincularTurnoPosto]] — Matriz turno x posto
- [[03-paginas/08 - Configurações]] — Empresa, horários, sistema (BD)
- [[03-paginas/09 - Algoritmo de Geração]] — Coverage-first, distribuição justa
- [[03-paginas/10 - Sistema de Alertas]] — 7 categorias, gravidade, UI colapsável
- [[03-paginas/11 - Códigos Especiais]] — D, F, Fe, FAA, L, Aci
- [[03-paginas/12 - Postos e Turnos]] — 8 postos, regras por dia/turno
- [[03-paginas/13 - PDF e Exportação]] — jsPDF, print, WhatsApp, html2canvas

### 04-componentes/
- [[04-componentes/01 - AuxDrawer]] — Painel lateral, ausências, calendário
- [[04-componentes/02 - Sidebar]] — Navegação colapsável, logo, perfil

### 05-contextos/
- [[05-contextos/01 - Autenticação]] — AuthContext, SignIn, guards
- [[05-contextos/02 - ConfigContext]] — Configurações globais da BD

### 06-devops/
- [[06-devops/01 - Histórico Git]] — Commits, fases de desenvolvimento
- [[06-devops/02 - Deploy Vercel]] — API REST v13, workflow

### 07-pendentes/
- [[07-pendentes/01 - Pendentes e TODOs]] — Features, melhorias técnicas
- [[07-pendentes/02 - Bugs Conhecidos]] — Bugs corrigidos e pendentes

---

## Links Externos

- [Supabase Dashboard](https://supabase.com/dashboard/project/rijonndemwuxihrzzmru)
- [Vercel Dashboard](https://vercel.com)
- [Repositório GitHub](https://github.com/dantasdev97/Hor-rio-hospitalar-)

---

## Visão Rápida

```
Login → Escala Mensal ←→ Escala Semanal
         ↓                      ↓
    Gerar Escala          Editar por Posto
    Alertas               Sincronização RT
    PDF/Print/WA          PDF/Print/WA
         ↓
    AuxDrawer (ausências)
    Restrições
    Configurações (BD)
    Sidebar (colapsável)
```
