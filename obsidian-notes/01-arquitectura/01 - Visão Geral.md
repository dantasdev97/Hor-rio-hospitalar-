---
tags: [visão-geral, stack, deploy]
updated: 2026-03-21
---

# 01 — Visão Geral do Projecto

> [[00 - MOC (Índice)|← Índice]]

## 🎯 O Que É

Sistema web de gestão de escalas de trabalho para o departamento de **Imagiologia** do **Hospital Leiria CHL**. Permite:

- Gerar escalas mensais automaticamente (cobertura-first + distribuição justa)
- Gerir a escala semanal por posto de trabalho
- Controlar ausências, restrições e configurações por auxiliar
- Exportar para PDF, impressão e partilha WhatsApp

---

## 🏗️ Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework UI** | React | 19.2.0 |
| **Linguagem** | TypeScript | ~5.9.3 |
| **Build Tool** | Vite | 5.4.21 |
| **Estilos** | Tailwind CSS | 3.4.19 |
| **UI Components** | Radix UI + Shadcn | várias |
| **Backend/DB** | Supabase (PostgreSQL) | 2.98.0 |
| **Routing** | React Router DOM | 7.13.1 |
| **Forms** | React Hook Form + Zod | 7.71.2 + 4.3.6 |
| **Datas** | date-fns | 4.1.0 |
| **PDF** | jsPDF + autoTable | 4.2.0 + 5.0.7 |
| **Screenshot** | html2canvas | 1.4.1 |
| **Ícones** | lucide-react | 0.577.0 |
| **Tabelas** | @tanstack/react-table | 8.21.3 |

---

## 🚀 Deploy & Ambiente

### Produção
- **Plataforma:** Vercel
- **Branch:** `main` → deploy automático
- **Env vars:** definidas no painel Vercel

### Desenvolvimento
- **Branch activo:** `claude/fix-auxdrawer-duplicate-property-Wtf9X`
- **Comando:** `npm run dev`

### Scripts
```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run preview  # Preview do build local
npm run lint     # ESLint
```

---

## 🔑 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=       # URL do projecto Supabase
VITE_SUPABASE_ANON_KEY=  # Chave anónima Supabase
```

> ⚠️ Nunca commitar `.env` — está no `.gitignore`

---

## 📁 Estrutura de Pastas

```
/
├── src/
│   ├── pages/          ← 9 páginas (rotas)
│   ├── components/     ← AuxDrawer + Shadcn UI
│   ├── contexts/       ← AuthContext.tsx
│   ├── lib/            ← supabaseClient.ts
│   ├── types/          ← index.ts (todas as interfaces)
│   ├── App.tsx         ← Router principal + guards
│   └── main.tsx        ← Entry point
├── supabase/
│   └── migrations/     ← SQL de criação de tabelas
├── obsidian-notes/     ← Este vault
├── public/             ← Assets estáticos
└── dist/               ← Build output (git ignore)
```

---

## ⚙️ Configuração Vite

```typescript
// vite.config.ts
{
  resolve: { alias: { "@": "./src" } },
  build: { chunkSizeWarningLimit: 2000 }  // Elevado por causa do jsPDF
}
```

---

## 🔗 Ver Também

- [[04 - Base de Dados]] — Schema Supabase completo
- [[22 - Dependências]] — Lista completa de packages
- [[23 - Histórico Git]] — Evolução do projecto
- [[21 - Configurações LocalStorage]] — cfg_empresa, cfg_horarios
