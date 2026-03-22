<div align="center">

# 🏥 Horário Hospitalar — CHL Imagiologia

**Sistema de gestão de escalas para o Serviço de Imagiologia**
Centro Hospitalar de Leiria · Unidade Local de Saúde da Região de Leiria, E.P.E.

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Status](https://img.shields.io/badge/Status-Produção-22C55E?style=flat-square)](.)

</div>

---

## Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Estatísticas do Sistema](#-estatísticas-do-sistema)
- [Stack Tecnológica](#-stack-tecnológica)
- [Módulos](#-módulos)
- [Base de Dados](#-base-de-dados)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Deploy para Produção](#-deploy-para-produção)
- [Documentação Interna](#-documentação-interna)

---

## 🎯 Visão Geral

Sistema web completo para **gestão automatizada de escalas hospitalares** no Serviço de Imagiologia do CHL. Elimina o processo manual de criação de escalas através de um algoritmo inteligente de distribuição, respeitando restrições laborais, ausências e regras de descanso.

```
Auxiliares   →   Restrições   →   Algoritmo   →   Escala Mensal
Doutores     →   Ausências    →   de Geração  →   Escala Semanal
Turnos       →   Postos       →   Automático  →   PDF / WhatsApp
```

---

## ✨ Funcionalidades

| Módulo | Funcionalidade | Detalhe |
|--------|---------------|---------|
| 📅 **Escala Mensal** | Geração automática | Algoritmo coverage-first com distribuição equitativa |
| 📋 **Escala Semanal** | Vista por posto de trabalho | 8 postos · turnos M/T/N em tempo real |
| 👥 **Auxiliares** | Gestão completa | CRUD · equipas · disponibilidade · fins de semana |
| 👨‍⚕️ **Doutores** | Vinculação a turnos | Relação N:N com turnos e postos |
| ⏰ **Turnos** | Configuração de horários | Cores · horários · postos associados |
| 🔗 **Turno ↔ Posto** | Matriz de vinculação | Visual M/T/N por posto |
| 🚫 **Restrições** | Motor de restrições | Por auxiliar · turno · posto · intervalo de datas |
| ⚙️ **Configurações** | Regras do sistema | Limites de turnos · horas de descanso · saúde da BD |
| 📤 **Exportação** | PDF · Impressão · WhatsApp | Partilha instantânea da escala |

---

## 📊 Estatísticas do Sistema

<table>
<tr>
<td align="center" width="25%">
<strong>8</strong><br/>Postos de Trabalho
</td>
<td align="center" width="25%">
<strong>3</strong><br/>Equipas de Auxiliares
</td>
<td align="center" width="25%">
<strong>4</strong><br/>Tipos de Turno
</td>
<td align="center" width="25%">
<strong>6</strong><br/>Códigos de Ausência
</td>
</tr>
</table>

### Postos de Trabalho

| Código | Descrição |
|--------|-----------|
| `RX_URG` | Radiologia de Urgência |
| `TAC1` | Tomografia Computadorizada 1 |
| `TAC2` | Tomografia Computadorizada 2 |
| `EXAM1` | Exames Complementares 1 |
| `EXAM2` | Exames Complementares 2 |
| `SALA6` | Sala 6 — BB |
| `SALA7` | Sala 7 — Extensões |
| `TRANSPORT` | Transporte Interno / Urgência |

### Equipas de Auxiliares

| Equipa | Função |
|--------|--------|
| **Equipa 1** | Cobertura de turnos principais |
| **Equipa 2** | Cobertura de turnos principais |
| **Equipa Transportes** | Transporte interno e urgências |

### Turnos

| Letra | Período | Horário |
|-------|---------|---------|
| **M** | Manhã | 06:00 → 14:00 |
| **T** | Tarde | 14:00 → 20:00 |
| **N** | Noite | 20:00 → 06:00 |
| **MT** | Misto | Manhã + Tarde |

### Códigos de Ausência

| Código | Descrição |
|--------|-----------|
| `D` | Descanso |
| `F` | Folga |
| `Fe` | Complemento de Feriado |
| `FAA` | Férias Ano Anterior |
| `L` | Licença |
| `Aci` | Acidente de Trabalho |

---

## 🛠 Stack Tecnológica

<details>
<summary><strong>Frontend</strong></summary>

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| React | 19.2.0 | Framework UI |
| TypeScript | ~5.9.3 | Tipagem estática |
| Vite | 5.4.21 | Build tool e dev server |
| Tailwind CSS | 3.4.19 | Estilização utilitária |
| Radix UI | latest | Componentes acessíveis |
| shadcn/ui | latest | Sistema de design |
| Lucide React | 0.577.0 | Ícones |
| React Router DOM | 7.13.1 | Roteamento SPA |

</details>

<details>
<summary><strong>Backend & Base de Dados</strong></summary>

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| Supabase | 2.98.0 | Backend-as-a-Service |
| PostgreSQL | via Supabase | Base de dados relacional |
| Supabase Auth | — | Autenticação email/password |
| Row Level Security | — | Segurança por linha |

</details>

<details>
<summary><strong>Utilitários & Exportação</strong></summary>

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| jsPDF | 4.2.0 | Geração de PDF |
| jspdf-autotable | 5.0.7 | Tabelas em PDF |
| html2canvas | 1.4.1 | Captura de ecrã |
| html2pdf.js | 0.14.0 | Export PDF completo |
| date-fns | 4.1.0 | Manipulação de datas (pt-BR) |
| React Hook Form | 7.71.2 | Gestão de formulários |
| Zod | 4.3.6 | Validação de esquemas |
| TanStack Table | 8.21.3 | Tabelas avançadas |

</details>

---

## 📦 Módulos

<details>
<summary><strong>📅 Escala Mensal</strong> — Geração automática de escalas</summary>

- Algoritmo **coverage-first** com distribuição equitativa por equipas
- Sistema de alertas em 7 categorias (cobertura, conflitos, restrições)
- Classificação automática M/T/N por horário de turno
- Exportação para PDF, impressão e partilha via WhatsApp
- Sincronização em tempo real com a escala semanal
- Suporte a códigos especiais de ausência por intervalo de datas

</details>

<details>
<summary><strong>📋 Escala Semanal</strong> — Vista detalhada por posto</summary>

- Grelha semanal por 8 postos de trabalho
- Edição individual de atribuições auxiliar/turno/posto
- Badges visuais M/T/N por célula
- Sincronização bidirecional com escala mensal
- Suporte a células multi-pessoa (ex: ECO URG)

</details>

<details>
<summary><strong>👥 Auxiliares</strong> — Gestão do pessoal auxiliar</summary>

- CRUD completo com campos: nome, número mecanográfico, NIF, email
- Toggle de disponibilidade e trabalho em fins de semana
- Classificação por equipas (Equipa 1 / 2 / Transportes)
- Painel lateral com calendário de ausências e histórico de restrições
- Filtro e pesquisa em tempo real

</details>

<details>
<summary><strong>🚫 Restrições</strong> — Motor de restrições laborais</summary>

- Definição por: auxiliar · turno · posto · intervalo de datas
- Motivo associado a cada restrição
- Integração automática no algoritmo de geração
- Interface de gestão com filtros por auxiliar e período

</details>

<details>
<summary><strong>⚙️ Configurações</strong> — Regras e limites do sistema</summary>

| Parâmetro | Valor por omissão |
|-----------|------------------|
| Turnos consecutivos máximos | 2 |
| Horas de descanso mínimas | 11h |
| Turnos noturnos máximos/semana | 2 |
| Turnos máximos/mês | 22 |
| Turnos noturnos máximos/mês | 4 |

</details>

---

## 🗄 Base de Dados

### Diagrama de Tabelas

```
auxiliares ─────────── escalas ─────────── turnos
     │                    │                   │
     └── restricoes        └── ausencias       └── doutor_turnos
                                                       │
                                              doutores ─┘
```

### Tabelas

| Tabela | Campos Principais |
|--------|-------------------|
| `auxiliares` | nome, equipa, disponivel, trabalha_fds |
| `doutores` | nome, numero_mecanografico |
| `turnos` | nome, horario_inicio, horario_fim, cor, postos[] |
| `doutor_turnos` | doutor_id, turno_id |
| `escalas` | data, auxiliar_id, turno_id, posto, turno_letra, status |
| `restricoes` | auxiliar_id, turno_id, posto, data_inicio, data_fim |
| `ausencias` | auxiliar_id, codigo, data_inicio, data_fim |

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js ≥ 18
- npm ou pnpm
- Conta Supabase (gratuita)

### Instalação local

```bash
# 1. Clonar o repositório
git clone https://github.com/dantasdev97/Hor-rio-hospitalar-.git
cd Hor-rio-hospitalar-

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# editar .env.local com as credenciais Supabase

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Abre `http://localhost:5173` no browser.

### Comandos disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (HMR)
npm run build    # Build de produção (TypeScript + Vite)
npm run preview  # Preview do build local
npm run lint     # ESLint
```

---

## 🔑 Variáveis de Ambiente

Cria um ficheiro `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Nunca fazer commit de credenciais reais. Os ficheiros `.env*` estão no `.gitignore`.

Como obter as credenciais: [supabase.com](https://supabase.com) → o teu projeto → `Settings` → `API`.

---

## 📡 Deploy para Produção

O projeto está configurado para deploy automático no Vercel a partir do branch `main`.

### Deploy manual (a partir da máquina local)

```bash
bash deploy.sh
```

O script verifica se há commits novos, faz merge `dev → main` e push para o Vercel.

### Configuração no Vercel

| Campo | Valor |
|-------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env Variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

---

## 📚 Documentação Interna

O vault [Obsidian](https://obsidian.md) em [`obsidian-notes/`](./obsidian-notes/) contém documentação técnica completa:

| Nota | Conteúdo |
|------|----------|
| [00 - MOC (Índice)](./obsidian-notes/00%20-%20MOC%20(%C3%8Dndice).md) | Índice geral de todas as notas |
| [04 - Base de Dados](./obsidian-notes/04%20-%20Base%20de%20Dados.md) | Schema completo das tabelas |
| [05 - Tipos TypeScript](./obsidian-notes/05%20-%20Tipos%20TypeScript.md) | Interfaces e tipos do sistema |
| [06 - Escala Mensal](./obsidian-notes/06%20-%20Escala%20Mensal.md) | Algoritmo de geração |
| [07 - Escala Semanal](./obsidian-notes/07%20-%20Escala%20Semanal.md) | Lógica da escala semanal |
| [08 - Auxiliares](./obsidian-notes/08%20-%20Auxiliares.md) | Gestão do pessoal |
| [10 - Turnos](./obsidian-notes/10%20-%20Turnos.md) | Configuração de turnos |
| [11 - Restrições](./obsidian-notes/11%20-%20Restri%C3%A7%C3%B5es.md) | Motor de restrições |
| [24 - Pendentes e TODOs](./obsidian-notes/24%20-%20Pendentes%20e%20TODOs.md) | Trabalho em curso |
| [23 - Histórico Git](./obsidian-notes/23%20-%20Hist%C3%B3rico%20Git.md) | Registo de alterações |

---

<div align="center">

Desenvolvido para o **Serviço de Imagiologia — CHL**
Centro Hospitalar de Leiria · Unidade Local de Saúde da Região de Leiria, E.P.E.

</div>
