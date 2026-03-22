---
tags: [arquitectura, estrutura, componentes]
updated: 2026-03-21
---

# 02 — Arquitectura e Estrutura

> [[00 - MOC (Índice)|← Índice]]

## 🗺️ Mapa de Ficheiros Críticos

| Ficheiro | Tamanho | Propósito |
|---|---|---|
| `src/pages/EscalaMensal.tsx` | ~68 KB / 1300 linhas | Motor de escala mensal + alertas + PDF |
| `src/pages/EscalaSemanal.tsx` | ~76 KB / 2000 linhas | Escala semanal por postos + sync |
| `src/components/AuxDrawer.tsx` | ~27 KB | Painel lateral auxiliar + ausências + calendário |
| `src/pages/Configuracoes.tsx` | ~26 KB | Configurações do sistema (localStorage) |
| `src/pages/Restricoes.tsx` | ~21 KB | Gestão de restrições por auxiliar |
| `src/pages/Auxiliares.tsx` | — | CRUD auxiliares + toggles |
| `src/pages/Turnos.tsx` | — | CRUD turnos + cores + postos |
| `src/pages/Doutores.tsx` | — | CRUD doutores + turnos associados |
| `src/pages/VincularTurnoPosto.tsx` | — | Matriz turno × posto |
| `src/pages/Login.tsx` | — | Autenticação Supabase |
| `src/types/index.ts` | — | Todas as interfaces TypeScript |
| `src/contexts/AuthContext.tsx` | — | Contexto de autenticação |
| `src/lib/supabaseClient.ts` | — | Cliente Supabase (env vars) |
| `src/App.tsx` | — | Router + guards |

---

## 🔄 Fluxo de Dados Principal

```
Supabase DB
    │
    ├─ auxiliares ──────→ EscalaMensal (geração, alertas)
    ├─ turnos ──────────→ EscalaMensal + EscalaSemanal
    ├─ escalas(mensal) ─→ EscalaMensal ←sync→ EscalaSemanal
    ├─ escalas(semanal)→ EscalaSemanal
    ├─ restricoes ──────→ EscalaSemanal (bloqueios)
    ├─ ausencias ───────→ AuxDrawer → escalas(mensal)
    ├─ doutores ────────→ EscalaSemanal (EXAM1/EXAM2 N)
    └─ doutor_turnos ───→ Doutores page
```

---

## 🔁 Sincronização Mensal ↔ Semanal

```
EscalaMensal gera escalas(mensal)
       ↓ Supabase Realtime
EscalaSemanal lê escalas(mensal) como "derivadas"
       ↓ Utilizador edita posto na semanal
EscalaSemanal cria escalas(semanal) + actualiza escalas(mensal)
       ↓ Supabase Realtime
EscalaMensal reflecte a alteração
```

### Canal Realtime Mensal
```typescript
`mensal-live-${year}-${month}`
```

### Canal Realtime Semanal
Subscreve alterações em `escalas` e re-fetcha `escalas(mensal)` da semana actual.

---

## 🧩 Hierarquia de Componentes

```
App.tsx
├── RequireAuth (guard)
│   └── Layout.tsx
│       ├── Sidebar.tsx (navegação)
│       ├── Header.tsx
│       └── <Outlet> (página activa)
│           ├── EscalaMensal
│           │   └── AuxDrawer (ao clicar num auxiliar)
│           ├── EscalaSemanal
│           ├── Auxiliares
│           │   └── AuxDrawer
│           ├── Turnos
│           ├── Doutores
│           ├── Restricoes
│           ├── VincularTurnoPosto
│           └── Configuracoes
└── RedirectIfAuthed (guard)
    └── Login
```

---

## 💾 Gestão de Estado

| Tipo | Usado Para |
|---|---|
| `useState` local | Dados de página (auxiliares, turnos, escalas) |
| `useMemo` | Dados derivados (alertas, filtros, sorted lists) |
| `useCallback` | Funções estáveis (fetch, save) |
| `useEffect` | Fetch inicial + subscriptions realtime |
| `React Context` | Sessão de autenticação (AuthContext) |
| `localStorage` | Configurações (cfg_empresa, cfg_horarios) |

---

## 🔗 Ver Também

- [[03 - Rotas e Navegação]]
- [[06 - Escala Mensal]]
- [[07 - Escala Semanal]]
- [[14 - AuxDrawer]]
- [[15 - Autenticação]]
