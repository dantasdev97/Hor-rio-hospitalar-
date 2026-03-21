# Configurações do Sistema

> Todas as configurações são guardadas em `localStorage` (lado do cliente).
> Geridas em `src/pages/Configuracoes.tsx`.

---

## Chave `cfg_horarios` — Regras de Escalonamento

```typescript
const DEFAULT_CFG = {
  bloquearTurnosConsecutivos: true,  // bloqueia turno M/T após turno N
  horasDescansMinimas: 11,           // horas mínimas entre fim de turno e início do seguinte
  maxTurnosNoturnos: 2,              // máx. turnos noturnos por semana (não usado activamente)
  maxTurnosMes: 22,                  // máx. turnos totais por mês
  maxTurnosNoturnosMes: 4,           // máx. turnos noturnos por mês
}
```

### Como é lida
```typescript
function loadCfg() {
  try {
    const r = localStorage.getItem("cfg_horarios")
    return r ? { ...DEFAULT_CFG, ...JSON.parse(r) } : DEFAULT_CFG
  } catch {
    return DEFAULT_CFG
  }
}
```

> Merge com `DEFAULT_CFG` garante que novos campos têm sempre um valor por defeito.

---

## Chave `cfg_empresa` — Dados da Organização

| Campo | Tipo | Exemplo |
|-------|------|---------|
| nome | string | "Hospital X" |
| departamento | string | "Serviço de Radiologia" |
| telefone | string | "+351 21 000 0000" |
| email | string | "radiologia@hospital.pt" |
| logo | string (base64 ou URL) | imagem do cabeçalho do PDF |

---

## Onde as Configurações São Usadas

### `cfg_horarios`
| Ficheiro | Onde | O que faz |
|---------|------|-----------|
| `EscalaMensal.tsx` | `calcularAlertas()` | Limites para alertas de excesso (F e G) |
| `EscalaMensal.tsx` | `gerarEscalaMensal()` | Limites durante geração automática |

### `cfg_empresa`
| Ficheiro | Onde | O que faz |
|---------|------|-----------|
| `EscalaMensal.tsx` | `exportPDF()` / `generateTableHTML()` | Cabeçalho do PDF/impressão |
| `Configuracoes.tsx` | Formulário | Editar e guardar |

---

## Limite Mínimo de Turnos (Subcarregado)

O mínimo de 15 turnos/mês para alerta de subcarregado está **hard-coded** em `calcularAlertas()`:

```typescript
const minTurnosMes = 15  // linha ~445, EscalaMensal.tsx
```

> Não está exposto nas Configurações — para alterar é preciso editar o código.

---

## Notas Relacionadas

- [[06 - Lógica de Escalas]]
- [[09 - Erros e Alertas]]

#configurações #localStorage #regras
