---
tags: [autenticação, auth, supabase, sessão]
updated: 2026-03-21
---

# 15 — Autenticação

> [[00 - MOC (Índice)|← Índice]]
> Ficheiros: `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`, `src/App.tsx`

## 🔐 Tecnologia

- **Supabase Auth** — email/password
- **React Context** — distribuição da sessão na app
- **Guards** — protecção de rotas

---

## 📦 AuthContext

```typescript
// Contexto disponível em toda a app
interface AuthContextType {
  session: Session | null    // Sessão Supabase activa
  user: User | null          // Utilizador da sessão
  loading: boolean           // A verificar sessão inicial
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}
```

---

## 🔄 Fluxo de Autenticação

### Carregamento Inicial
```typescript
// 1. Verifica sessão existente
const { data: { session } } = await supabase.auth.getSession()
setSession(session)
setLoading(false)

// 2. Subscreve alterações em tempo real
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session)
})
```

### Sign In
```typescript
// signIn(email, password)
const { error } = await supabase.auth.signInWithPassword({ email, password })

// Mensagens de erro tratadas:
"Invalid login credentials" → "Email ou password incorretos."
"Email not confirmed"       → "Email não confirmado. Verifique a sua caixa de entrada."
// Outros erros → mensagem original do Supabase
```

### Sign Out
```typescript
await supabase.auth.signOut()
// Supabase limpa a sessão → onAuthStateChange dispara → session = null → redirect /login
```

---

## 🛡️ Guards de Rotas

### `RequireAuth`
```typescript
// Loading → <LoadingScreen />
// Sem sessão → <Navigate to="/login" replace />
// Com sessão → <Outlet /> (renderiza página)
```

### `RedirectIfAuthed`
```typescript
// Loading → <LoadingScreen />
// Com sessão → <Navigate to="/escala-mensal" replace />
// Sem sessão → <Outlet /> (renderiza /login)
```

---

## 🖥️ Página Login

- Email input
- Password input
- Botão "Entrar"
- Mostra mensagem de erro se signIn retorna error
- Após login bem-sucedido → redirect automático para /escala-mensal (via RedirectIfAuthed)

---

## 🔗 Ver Também

- [[03 - Rotas e Navegação]] — Guards nas rotas
- [[01 - Visão Geral]] — Variáveis de ambiente Supabase
