---
tags: [rotas, navegação, guards]
updated: 2026-03-21
---

# 03 — Rotas e Navegação

> [[00 - MOC (Índice)|← Índice]]

## 🗺️ Todas as Rotas

### Rotas Protegidas (requerem autenticação)

| Rota | Componente | Descrição |
|---|---|---|
| `/` | redirect → `/escala-mensal` | Redireccionamento raiz |
| `/escala-mensal` | `EscalaMensal` | Calendário mensal com geração automática |
| `/escala-semanal` | `EscalaSemanal` | Grelha semanal por posto |
| `/auxiliares` | `Auxiliares` | Gestão de auxiliares |
| `/turnos` | `Turnos` | Gestão de turnos |
| `/turno-postos` | `VincularTurnoPosto` | Vincular turnos a postos |
| `/doutores` | `Doutores` | Gestão de médicos |
| `/restricoes` | `Restricoes` | Restrições por auxiliar |
| `/configuracoes` | `Configuracoes` | Configurações do sistema |

### Rota Pública

| Rota | Componente | Descrição |
|---|---|---|
| `/login` | `Login` | Autenticação (redireciona se já autenticado) |

### Fallback

| Rota | Comportamento |
|---|---|
| `/*` | `Navigate to /` |

---

## 🔐 Guards de Autenticação

### `RequireAuth`
```typescript
// Bloqueia acesso se não autenticado
// Mostra LoadingScreen enquanto loading === true
// Redireciona para /login se session === null
```

### `RedirectIfAuthed`
```typescript
// Impede acesso ao /login se já autenticado
// Mostra LoadingScreen enquanto loading === true
// Redireciona para /escala-mensal se session !== null
```

---

## 🧭 Sidebar

A sidebar está definida em `Layout.tsx` / `Sidebar.tsx` e contém links para todas as rotas protegidas com ícones Lucide React:

| Ícone | Label | Rota |
|---|---|---|
| `Calendar` | Escala Mensal | `/escala-mensal` |
| `CalendarDays` | Escala Semanal | `/escala-semanal` |
| `Users` | Auxiliares | `/auxiliares` |
| `Clock` | Turnos | `/turnos` |
| `Link` | Turno ↔ Posto | `/turno-postos` |
| `UserRound` | Doutores | `/doutores` |
| `Ban` | Restrições | `/restricoes` |
| `Settings` | Configurações | `/configuracoes` |

---

## 🔗 Ver Também

- [[15 - Autenticação]] — AuthContext, signIn, signOut
- [[02 - Arquitectura e Estrutura]] — Hierarquia de componentes
