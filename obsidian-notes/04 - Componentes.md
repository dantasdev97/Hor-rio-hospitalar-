# Componentes

> Componentes reutilizáveis da aplicação.

---

## Layout

### `src/components/layout/Layout.tsx`
Wrapper principal da aplicação (após login).
- Flex layout: sidebar fixa à esquerda + área de conteúdo
- Inclui `<Sidebar>` e `<Header>` (mobile)

### `src/components/layout/Sidebar.tsx`
Navegação lateral fixa.
- Links para todas as páginas com ícones (lucide-react)
- Destaque da rota activa
- Botão de logout no fundo

### `src/components/layout/Header.tsx`
Cabeçalho visível apenas em mobile.
- Botão de menu (hamburger) para abrir/fechar sidebar
- Título da app

---

## AuxDrawer

**Ficheiro:** `src/components/AuxDrawer.tsx`
**Tamanho:** ~27 KB

Painel lateral de detalhe de um auxiliar. Abre ao clicar no nome na escala mensal.

### Funcionalidades
- Ver e editar dados do auxiliar (nome, email, nº mecanográfico, NIF)
- Calendário de ausências por mês (paginado)
- Selector de intervalo de datas para marcar ausências
- Códigos especiais: D, F, Fe, FAA, L, Aci
- Guardar / eliminar ausências na tabela `ausencias`
- Callback `onAusenciaSaved()` → refaz fetch na escala mensal

### Props
```typescript
interface Props {
  aux: Auxiliar
  onClose: () => void
  onUpdated: (updated: Auxiliar) => void
  onAusenciaSaved: () => void
}
```

---

## UI (Shadcn / Radix)

Localização: `src/components/ui/`

| Ficheiro | Componente | Uso |
|---------|-----------|-----|
| `button.tsx` | `<Button>` | Botões em toda a app |
| `input.tsx` | `<Input>` | Campos de texto |
| `label.tsx` | `<Label>` | Labels de formulário |
| `badge.tsx` | `<Badge>` | Badges de estado |
| `card.tsx` | `<Card>` | Cartões de conteúdo |
| `dialog.tsx` | `<Dialog>` | Modals/diálogos |
| `select.tsx` | `<Select>` | Dropdowns |
| `switch.tsx` | `<Switch>` | Toggles on/off |
| `table.tsx` | `<Table>` | Tabelas de dados |
| `tabs.tsx` | `<Tabs>` | Separadores |
| `separator.tsx` | `<Separator>` | Divisores visuais |

Todos baseados em Radix UI + Tailwind CSS. Acessíveis por defeito.

---

## Modais Inline (em EscalaMensal.tsx)

### `GenModal`
Modal de progresso durante geração automática.
- Barra de progresso animada
- Log das últimas entradas inseridas
- Ícone pulsante com gradiente

### `ConfirmModal`
Modal de confirmação para acções destrutivas.
- Usado para "Limpar mês"
- Props: `title`, `body`, `onConfirm`, `onCancel`

---

## Contextos

### `src/contexts/AuthContext.tsx`
Fornece estado de autenticação Supabase para toda a app.

```typescript
interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}
```

- Escuta `onAuthStateChange` do Supabase
- Wrap em `AuthProvider` no `App.tsx`

---

## Notas Relacionadas

- [[01 - Visão Geral]]
- [[03 - Páginas e Rotas]]
- [[05 - Tipos TypeScript]]

#componentes #layout #ui #shadcn
