# Sidebar

## Descrição
Sidebar colapsável com navegação agrupada, logo dinâmica, perfil do coordenador e logout.

## Ficheiros
- `src/components/layout/Sidebar.tsx` — componente principal (~385 linhas)
- `src/components/layout/Layout.tsx` — wrapper que inclui Sidebar

## Funcionalidades
- [x] Navegação agrupada: Horários, Cadastro, Gerenciamento, Sistema
- [x] Colapsar/expandir (desktop): botão flutuante, transição `w-64` ↔ `w-[68px]`
- [x] Logo dinâmica da empresa (de `useConfig().empresa.logo`)
- [x] Perfil do coordenador: modal com foto, nome, telemóvel, nº mecanográfico
- [x] Avatar com gradiente e inicial do nome
- [x] Mobile: overlay + translate-x animation
- [x] Active state com `border-l-[3px] border-primary-500`

## Grupos de Navegação

| Grupo | Itens | Ícones |
|-------|-------|--------|
| Horários | Escala Mensal, Escala Semanal | CalendarDays, Calendar |
| Cadastro | Doutores, Auxiliares | Stethoscope, Users |
| Gerenciamento | Turnos, Turnos + Postos | Clock, Link2 |
| Sistema | Configurações | Settings |

## Lógica de Botões

| Botão | Ação | Função |
|-------|------|--------|
| Collapse toggle | Alterna sidebar expandida/colapsada | `setCollapsed(v => !v)` |
| NavLink | Navega e fecha sidebar (mobile) | `onClick={onClose}` |
| Avatar/Perfil | Abre modal de perfil | `setPerfilOpen(true)` |
| "Guardar" (modal) | Persiste perfil na BD | `savePerfil(form)` |
| "Terminar sessão" | Logout e redirect para /login | `handleSignOut()` |

## Modal Perfil (PerfilModal)
- Foto de perfil (upload base64, max 200KB)
- Nome completo (editável)
- Email (read-only, vem de `auth.user.email`)
- Telemóvel e nº mecanográfico
- Persistência via `useConfig().savePerfil()`

## Dependências
- `useConfig()` — empresa.logo, empresa.nome, perfil
- `useAuth()` — user, signOut
