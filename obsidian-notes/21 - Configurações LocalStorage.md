---
tags: [localstorage, configurações, defaults]
updated: 2026-03-21
---

# 21 — Configurações LocalStorage

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Configuracoes.tsx`

## 📦 Chaves LocalStorage

| Chave | Tipo | Propósito |
|---|---|---|
| `cfg_empresa` | JSON | Dados da empresa/hospital |
| `cfg_horarios` | JSON | Regras de escala e limites |

---

## 🏢 cfg_empresa — Defaults

```typescript
const DEFAULT_EMPRESA = {
  nome: "Hospital Leiria CHL",
  departamento: "Imagiologia",
  telefone: "",
  email: "",
  logo: null,           // base64 string quando carregado
}
```

| Campo | Usado Em |
|---|---|
| `nome` | PDF cabeçalho |
| `departamento` | PDF cabeçalho |
| `telefone` | — (informativo) |
| `email` | — (informativo) |
| `logo` | PDF cabeçalho (imagem) |

---

## ⏰ cfg_horarios — Defaults e Limites

```typescript
const DEFAULT_CFG = {
  bloquearTurnosConsecutivos: true,    // Bloqueia M após N
  horasDescansMinimas: 11,             // Mínimo de descanso entre turnos
  maxTurnosSemana: 5,                  // Máximo de turnos por semana
  maxTurnosNoturnos: 2,                // Máximo de noturnos por semana
  alertasConflito: true,               // Alerta quando aux em 2+ postos
  permitirSubstituicoes: false,        // Permitir substituições
  maxTurnosMes: 22,                    // Máximo de turnos por mês
  maxTurnosNoturnosMes: 4,             // Máximo de noturnos por mês
}
```

### Impacto de Cada Campo

| Campo | Usado Em |
|---|---|
| `bloquearTurnosConsecutivos` | EscalaSemanal `getAuxBlockReason()` |
| `horasDescansMinimas` | EscalaMensal alerta E (descanso pós-noturno) |
| `maxTurnosSemana` | (preparado mas não activamente validado) |
| `maxTurnosNoturnos` | (preparado mas não activamente validado) |
| `alertasConflito` | EscalaSemanal `getAuxBlockReason()` |
| `permitirSubstituicoes` | (preparado mas não activamente usado) |
| `maxTurnosMes` | EscalaMensal alerta F (excesso mensal) |
| `maxTurnosNoturnosMes` | EscalaMensal alerta F + algoritmo de geração |

### Limites de Validação na UI

| Campo | Mínimo | Máximo |
|---|---|---|
| `horasDescansMinimas` | 8 | 24 |
| `maxTurnosSemana` | 1 | 7 |
| `maxTurnosNoturnos` | 0 | 7 |
| `maxTurnosMes` | 1 | 31 |
| `maxTurnosNoturnosMes` | 0 | 20 |

---

## 🔧 Helpers de Leitura/Escrita

```typescript
// Carregar com merge dos defaults (nunca fica com campo undefined)
function loadConfig<T>(key: string, defaults: T): T {
  const raw = localStorage.getItem(key)
  return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
}

// Guardar como JSON
function saveConfig<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}
```

---

## 🔗 Ver Também

- [[13 - Configurações]] — Página de configurações
- [[16 - Algoritmo de Geração]] — Uso de maxTurnosNoturnosMes
- [[17 - Sistema de Alertas]] — Uso de maxTurnosMes, horasDescansMinimas
- [[07 - Escala Semanal]] — Uso de bloquearTurnosConsecutivos, alertasConflito
