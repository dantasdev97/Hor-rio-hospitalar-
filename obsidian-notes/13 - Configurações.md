---
tags: [configurações, settings, empresa]
updated: 2026-03-21
---

# 13 — Configurações

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Configuracoes.tsx`

## 🎯 O Que Faz

Página de configurações com 3 tabs:
1. **Empresa** — Nome, departamento, logo, contactos
2. **Horários** — Regras de escala e limites
3. **Sistema** — Diagnóstico da base de dados e ambiente

---

## 🏢 Tab: Empresa (cfg_empresa)

Guardado em `localStorage` com a chave `cfg_empresa`.

```typescript
interface EmpresaConfig {
  nome: string          // Default: "Hospital Leiria CHL"
  departamento: string  // Default: "Imagiologia"
  telefone: string      // Default: ""
  email: string         // Default: ""
  logo: string | null   // Base64 da imagem, Default: null
}
```

**Upload de Logo:**
- Formatos aceites: PNG, JPG, SVG
- Tamanho máximo: 2 MB
- Armazenado como base64 no localStorage

---

## ⏰ Tab: Horários (cfg_horarios)

Guardado em `localStorage` com a chave `cfg_horarios`.

```typescript
interface HorariosConfig {
  bloquearTurnosConsecutivos: boolean  // Default: true
  horasDescansMinimas: number          // Default: 11 (horas)
  maxTurnosSemana: number              // Default: 5
  maxTurnosNoturnos: number            // Default: 2 (por semana)
  alertasConflito: boolean             // Default: true
  permitirSubstituicoes: boolean       // Default: false
  maxTurnosMes: number                 // Default: 22
  maxTurnosNoturnosMes: number         // Default: 4
}
```

### Validações dos Campos

| Campo | Mínimo | Máximo |
|---|---|---|
| `horasDescansMinimas` | 8 | 24 |
| `maxTurnosSemana` | 1 | 7 |
| `maxTurnosNoturnos` | 0 | 7 |
| `maxTurnosMes` | 1 | 31 |
| `maxTurnosNoturnosMes` | 0 | 20 |

---

## 🔧 Funções Helper

```typescript
// Carregar config com fallback para defaults
function loadConfig<T>(key: string, defaults: T): T {
  const stored = localStorage.getItem(key)
  return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
}

// Guardar config
function saveConfig<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}
```

---

## 🖥️ Tab: Sistema

Verifica estado de cada tabela e variáveis de ambiente:

| Item verificado | O Que Testa |
|---|---|
| Tabela `auxiliares` | SELECT count(*) — existe e acessível |
| Tabela `turnos` | SELECT count(*) — existe e acessível |
| Tabela `doutores` | SELECT count(*) — existe e acessível |
| Tabela `restricoes` | SELECT count(*) — existe e acessível |
| Tabela `escalas` | SELECT count(*) — existe e acessível |
| `VITE_SUPABASE_URL` | `import.meta.env.VITE_SUPABASE_URL` definida |
| `VITE_SUPABASE_ANON_KEY` | `import.meta.env.VITE_SUPABASE_ANON_KEY` definida |

---

## 🔗 Ver Também

- [[21 - Configurações LocalStorage]] — Detalhes completos de cfg_empresa e cfg_horarios
- [[17 - Sistema de Alertas]] — Como cfg_horarios afecta os alertas
- [[16 - Algoritmo de Geração]] — Como cfg_horarios afecta a geração
