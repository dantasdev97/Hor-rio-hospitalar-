# Visão Geral — Horário Hospitalar

> Sistema de gestão de escalas para o departamento de Radiologia hospitalar.

---

## O Que É

Aplicação web para criar, gerir e exportar escalas de trabalho de auxiliares e médicos num serviço de radiologia hospitalar. Permite geração automática de escalas mensais com validação de regras (descanso, turno noturno, fins-de-semana, etc.).

---

## Stack Técnico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | React | 19.2.0 |
| Linguagem | TypeScript | ~5.9.3 |
| Build | Vite | 5.4.21 |
| Estilo | Tailwind CSS | 3.4.19 |
| Backend / DB | Supabase | 2.98.0 |
| Routing | React Router DOM | 7.13.1 |
| UI Components | Radix UI + Shadcn | — |
| Ícones | lucide-react | 0.577.0 |
| Datas | date-fns (ptBR) | 4.1.0 |
| PDF | jsPDF + jspdf-autotable | 4.2.0 / 5.0.7 |
| Captura | html2canvas | 1.4.1 |
| Formulários | React Hook Form + Zod | 7.71.2 / 4.3.6 |
| Tabelas avançadas | @tanstack/react-table | 8.21.3 |

---

## Deploy

- **Produção:** Vercel, branch `main`
- **URL produção:** (definido nas env vars do projecto Vercel)
- **Branch de desenvolvimento:** `claude/fix-auxdrawer-duplicate-property-Wtf9X`

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=<url do projecto Supabase>
VITE_SUPABASE_ANON_KEY=<chave anon pública>
```

Definidas em `.env.local` (não comitado) e nas env vars da Vercel.

---

## Rotas da Aplicação

| Rota | Página | Ficheiro |
|------|--------|---------|
| `/login` | Login | `src/pages/Login.tsx` |
| `/` | Redireciona para `/escala-mensal` | `App.tsx` |
| `/escala-mensal` | Escala Mensal | `src/pages/EscalaMensal.tsx` |
| `/escala-semanal` | Escala Semanal | `src/pages/EscalaSemanal.tsx` |
| `/auxiliares` | Gerir Auxiliares | `src/pages/Auxiliares.tsx` |
| `/turnos` | Gerir Turnos | `src/pages/Turnos.tsx` |
| `/turno-postos` | Vincular Turno ↔ Posto | `src/pages/VincularTurnoPosto.tsx` |
| `/doutores` | Gerir Médicos | `src/pages/Doutores.tsx` |
| `/restricoes` | Restrições | `src/pages/Restricoes.tsx` |
| `/configuracoes` | Configurações | `src/pages/Configuracoes.tsx` |

Guards:
- `RequireAuth` — redireciona para `/login` se não autenticado
- `RedirectIfAuthed` — redireciona para `/escala-mensal` se já autenticado

---

## Estrutura de Pastas

```
src/
├── pages/          # Páginas da aplicação
├── components/     # Componentes reutilizáveis
│   ├── layout/     # Layout, Sidebar, Header
│   └── ui/         # Shadcn UI (Button, Dialog, etc.)
├── contexts/       # AuthContext
├── lib/            # supabaseClient, utils
└── types/          # index.ts com todas as interfaces

supabase/
└── migrations/     # SQL de criação de tabelas
```

---

## Notas Relacionadas

- [[02 - Base de Dados]]
- [[03 - Páginas e Rotas]]
- [[06 - Lógica de Escalas]]

#projecto #stack #deploy #rotas
