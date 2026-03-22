---
tags: [dependências, packages, npm]
updated: 2026-03-21
---

# 22 — Dependências

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `package.json` (versão do projecto: 0.0.0)

## 📦 Dependências de Produção

### Core
| Package | Versão | Propósito |
|---|---|---|
| `react` | ^19.2.0 | Framework UI |
| `react-dom` | ^19.2.0 | Renderização DOM |
| `react-router-dom` | ^7.13.1 | Routing SPA |
| `typescript` | ~5.9.3 | Tipagem estática |

### Backend / Dados
| Package | Versão | Propósito |
|---|---|---|
| `@supabase/supabase-js` | ^2.98.0 | Cliente Supabase (DB + Auth + Realtime) |

### UI / Estilos
| Package | Versão | Propósito |
|---|---|---|
| `tailwindcss` | ^3.4.19 | CSS utilitário |
| `@radix-ui/react-dialog` | ^1.1.15 | Modal acessível |
| `@radix-ui/react-label` | ^2.1.8 | Label acessível |
| `@radix-ui/react-scroll-area` | ^1.2.10 | Scroll personalizado |
| `@radix-ui/react-select` | ^2.2.6 | Dropdown acessível |
| `@radix-ui/react-separator` | ^1.1.8 | Separador |
| `@radix-ui/react-slot` | ^1.2.4 | Composição Radix |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle switch |
| `@radix-ui/react-tabs` | ^1.1.13 | Tabs acessíveis |
| `lucide-react` | ^0.577.0 | Ícones SVG |
| `class-variance-authority` | ^0.7.1 | Variantes CSS (Shadcn) |
| `clsx` | ^2.1.1 | Merge de classNames |
| `tailwind-merge` | ^3.5.0 | Merge inteligente Tailwind |

### Formulários / Validação
| Package | Versão | Propósito |
|---|---|---|
| `react-hook-form` | ^7.71.2 | Gestão de formulários |
| `@hookform/resolvers` | ^5.2.2 | Integração Zod ↔ RHF |
| `zod` | ^4.3.6 | Schema validation |

### Datas
| Package | Versão | Propósito |
|---|---|---|
| `date-fns` | ^4.1.0 | Manipulação de datas (locale PT) |

### Tabelas
| Package | Versão | Propósito |
|---|---|---|
| `@tanstack/react-table` | ^8.21.3 | Tabelas avançadas (headless) |

### Exportação / PDF
| Package | Versão | Propósito |
|---|---|---|
| `jspdf` | ^4.2.0 | Geração de PDF |
| `jspdf-autotable` | ^5.0.7 | Tabelas em PDF |
| `html2canvas` | ^1.4.1 | Captura de ecrã (WhatsApp) |
| `html2pdf.js` | ^0.14.0 | (Legacy — ainda incluído mas jsPDF é o principal) |

---

## 🔧 Dependências de Desenvolvimento

| Package | Versão | Propósito |
|---|---|---|
| `vite` | ^5.4.21 | Build tool + dev server |
| `@vitejs/plugin-react` | ^4.7.0 | Plugin React para Vite |
| `@types/react` | ^19.2.7 | Tipos React |
| `@types/react-dom` | ^19.2.3 | Tipos React DOM |
| `@types/node` | ^24.12.0 | Tipos Node.js |
| `eslint` | ^9.39.1 | Linter |
| `@eslint/js` | ^9.39.1 | Config ESLint |
| `eslint-plugin-react-hooks` | ^7.0.1 | Regras hooks |
| `eslint-plugin-react-refresh` | ^0.4.24 | HMR correctness |
| `typescript-eslint` | ^8.48.0 | ESLint + TypeScript |
| `autoprefixer` | ^10.4.27 | CSS prefixes |
| `postcss` | ^8.5.8 | CSS processing |
| `globals` | ^16.5.0 | Globals ESLint |

---

## ⚠️ Observações

- `html2pdf.js` ainda está nas dependências mas o sistema migrou para `jsPDF + autoTable`
- Chunk size warning limit elevado para 2000 KB devido ao tamanho das libs PDF
- Bundle é significativamente grande — considerar code splitting se performance degradar

---

## 🔗 Ver Também

- [[20 - PDF e Exportação]] — Como as libs PDF são usadas
- [[01 - Visão Geral]] — Stack resumida
