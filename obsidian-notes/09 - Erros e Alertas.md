# Erros e Alertas do Sistema

> Lista completa de todos os alertas gerados por `calcularAlertas()` em `EscalaMensal.tsx`.
> A função é memoizada: `useMemo(() => calcularAlertas(), [escalas, auxiliares, turnos, year, month, loading])`

---

## Como Funciona o Painel de Alertas

- Aparece abaixo da tabela da escala mensal
- Recalcula automaticamente sempre que uma célula é guardada
- Quando um alerta desaparece (problema resolvido) → banner verde **"✅ N alerta(s) resolvido(s)!"** durante 3 segundos
- Se não houver alertas → fundo verde **"✅ Escala sem alertas — todos os turnos com cobertura adequada"**

### Estrutura Visual
```
┌─────────────────────────────────────────┐
│ 🚨 N erros  ⚠️ N avisos  📋 N ausências  │  ← barra de sumário
├─────────────────────────────────────────┤
│ ▼ Falta de Cobertura (N) 🚨             │  ← secção colapsável
│   erro com borda vermelha               │
├─────────────────────────────────────────┤
│ ▼ Violações de Descanso (N) 😴          │
├─────────────────────────────────────────┤
│ ▼ Carga de Trabalho (N) ⚠️              │  ← excessos + subcarregados
├─────────────────────────────────────────┤
│ ▼ Ausências Registadas (N) 📋           │
└─────────────────────────────────────────┘
```

### Cores por Tipo
| Tipo | Borda | Fundo | Uso |
|------|-------|-------|-----|
| `erro` | Vermelho | Rosa claro | Problema grave — precisa de ação |
| `aviso` | Amarelo | Amarelo claro | Atenção — pode ser aceitável |
| `info` | Azul | Azul claro | Informativo — ausências registadas |

---

## Secção A — Ausências

**Categoria:** `ausencia` | **Tipo:** `info`

Gerado para cada célula com código especial de ausência real (L, Aci, FAA, Fe).

**Exemplo:**
> `Maria Silva — licença / baixa médica no dia 16/3 (Dom)`

**Códigos que geram alerta:**
- `L` → "licença / baixa médica"
- `Aci` → "acidente de trabalho"
- `FAA` → "férias (ano anterior)"
- `Fe` → "folga por feriado"

**ID:** `info_ausencia_{dia}_{auxiliar_id}_{codigo}`

---

## Secção B — Cobertura Turno N

**Categoria:** `cobertura`

O turno noturno precisa de **exactamente 2** auxiliares (RX URG + TAC 2).

| Situação | Tipo | Mensagem |
|----------|------|---------|
| 0 auxiliares no turno N | `erro` | `16/3 (Dom) — Turno N sem nenhum auxiliar atribuído` |
| 1 auxiliar no turno N | `erro` | `16/3 (Dom) — Turno N: apenas João Silva (falta 1 auxiliar)` |
| 3+ auxiliares no turno N | `aviso` | `16/3 (Dom) — 3 auxiliares no Turno N: ... (esperado 2)` |

> **Nota:** Só dispara se houver pelo menos uma entrada com turno nesse dia (`dayWithTurno.length > 0`). Dias completamente vazios não geram erro.

**IDs:** `erro_cobertura_N0_{dia}`, `erro_cobertura_N1_{dia}`, `aviso_cobertura_Nexcess_{dia}`

---

## Secção C — Cobertura EXAM1

**Categoria:** `cobertura` | Aplicável: Segunda a Sábado (não Domingo)

Posto Exames Complementares (1) precisa de cobertura nos turnos M e T.

| Situação | Tipo | Mensagem |
|----------|------|---------|
| Sem auxiliar no Turno M | `erro` | `17/3 (Ter) — Exames Complementares sem auxiliar no Turno M` |
| Sem auxiliar no Turno T | `aviso` | `17/3 (Ter) — Exames Complementares sem auxiliar no Turno T` |

> Detecta verificando se algum turno M/T atribuído nesse dia tem `postos[]` a incluir `"EXAM1"`.

**IDs:** `erro_cobertura_exam1M_{dia}`, `aviso_cobertura_exam1T_{dia}`

---

## Secção D — Fim de Semana Indevido

**Categoria:** `cobertura` | **Tipo:** `erro`

Dispara quando um auxiliar com `trabalha_fds === false` é escalado ao sábado ou domingo.

**Exemplo:**
> `Pedro Rocha escalado/a ao Sábado 15/3 (Sáb)`
> ↳ Este/a auxiliar não está configurado/a para trabalhar ao fim de semana

**ID:** `erro_cobertura_fds_{dia}_{auxiliar_id}`

---

## Secção E — Descanso Pós-Noturno Violado

**Categoria:** `descanso` | **Tipo:** `erro`

Ocorre quando um auxiliar faz turno N no dia D e tem turno M ou T atribuído no dia D+1.
Viola a regra de 11h mínimas de descanso.

**Exemplo:**
> `Ana Santos — Turno N em 14/3 seguido de Turno M em 15/3`
> ↳ Descanso mínimo de 11h violado entre turnos consecutivos

**ID:** `erro_descanso_{auxiliar_id}_{data_noturno}`

---

## Secção F — Excesso Mensal

**Categoria:** `excesso` | **Tipo:** `aviso`

| Situação | Mensagem |
|----------|---------|
| Demasiados turnos N | `Catarina — 5 turnos N este mês (limite: 4)` |
| Demasiados turnos totais | `Eurico — 23 turnos este mês (limite: 22)` |

Limites configuráveis em [[08 - Configurações]]:
- `maxTurnosNoturnosMes` (default: 4)
- `maxTurnosMes` (default: 22)

**IDs:** `aviso_excesso_N_{auxiliar_id}`, `aviso_excesso_total_{auxiliar_id}`

---

## Secção G — Subcarregado (Poucos Turnos)

**Categoria:** `excesso` | **Tipo:** `aviso`

Dispara quando um auxiliar tem turnos atribuídos mas abaixo do mínimo recomendado (15).

**Exemplo:**
> `Rui Ferreira — apenas 8 turnos este mês (mínimo recomendado: 15)`

> Só dispara se `total > 0` — auxiliares sem nenhum turno não geram este aviso.

**ID:** `aviso_subcarregado_{auxiliar_id}`

> Limite hard-coded: 15 turnos. Ver [[08 - Configurações]].

---

## Tabela Resumo de Todos os Alertas

| Secção | ID Pattern | Tipo | Categoria | Condição |
|--------|-----------|------|-----------|----------|
| A | `info_ausencia_*` | info | ausencia | código L/Aci/FAA/Fe na célula |
| B | `erro_cobertura_N0_*` | erro | cobertura | 0 auxiliares no turno N |
| B | `erro_cobertura_N1_*` | erro | cobertura | 1 auxiliar no turno N |
| B | `aviso_cobertura_Nexcess_*` | aviso | cobertura | 3+ auxiliares no turno N |
| C | `erro_cobertura_exam1M_*` | erro | cobertura | EXAM1 sem turno M (seg–sáb) |
| C | `aviso_cobertura_exam1T_*` | aviso | cobertura | EXAM1 sem turno T (seg–sáb) |
| D | `erro_cobertura_fds_*` | erro | cobertura | auxiliar sem trabalha_fds ao FDS |
| E | `erro_descanso_*` | erro | descanso | N → M/T no dia seguinte |
| F | `aviso_excesso_N_*` | aviso | excesso | > maxTurnosNoturnosMes |
| F | `aviso_excesso_total_*` | aviso | excesso | > maxTurnosMes |
| G | `aviso_subcarregado_*` | aviso | excesso | 0 < total < 15 |

---

## Notas Relacionadas

- [[06 - Lógica de Escalas]]
- [[07 - Códigos Especiais]]
- [[08 - Configurações]]
- [[10 - Pendentes e TODOs]]

#alertas #validação #erros #cobertura
