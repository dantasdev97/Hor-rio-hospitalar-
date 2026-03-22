# Gerar Escala — Lógica do Botão

## Descrição
O botão "Gerar Escala" na página Escala Mensal (`EscalaMensal.tsx`) executa a função `gerarEscalaMensal()` que gera automaticamente a escala de turnos para todos os auxiliares do mês seleccionado.

## Ficheiros
- `src/pages/EscalaMensal.tsx` — função `gerarEscalaMensal()` (linha ~704)

## Pré-condições
- Deve haver pelo menos 1 turno cadastrado
- Carrega restrições e ausências do mês da BD antes de começar

---

## Algoritmo — 3 Fases

### Fase 1: Preparação (linhas 710-792)

1. **Carregar dados da BD:**
   - `restricoes` — quais auxiliares têm restrição a quais turnos
   - `ausencias` — quais auxiliares estão ausentes em quais dias (férias, licença, etc.)

2. **Construir mapas de bloqueio:**
   - `turnoRestr[auxId]` → `Set<turnoId>` — turnos proibidos por auxiliar
   - `ausBlocked` → `Map<"auxId_data", codigo>` — dias bloqueados por ausência
   - `noturnoIds` → `Set<turnoId>` — IDs dos turnos nocturnos

3. **Configurações de horários** (de `useConfig().horarios`):
   - `maxTurnosNoturnosMes` — limite de turnos N por auxiliar/mês

### Fase 2: Coverage-First Pre-Planning (linhas 784-850)

Para cada dia do mês, o algoritmo garante cobertura mínima de cada tipo de turno:

**Requisitos de cobertura por dia:**

| Dia | Noturno (N) | Manhã (M) | Tarde (T) |
|-----|-------------|-----------|-----------|
| Domingo | 2 | 3 | 3 |
| Seg–Sáb | 2 | 8 | 7 |

**Prioridade de preenchimento:** N → M → T (nocturnos primeiro)

**Ordenação para seleção justa:**
- Turnos N: ordenar por menos nocturnos atribuídos (`auxNocCount`)
- Turnos M/T: ordenar por menos turnos totais planeados (`auxPlanCount`)

**Filtros de elegibilidade (um aux é elegível se):**
- Não trabalha FDS → excluído em Sáb/Dom
- Sem ausência neste dia (`ausBlocked`)
- Sem entrada manual já existente (`escalas`)
- Sem outro turno já planeado hoje (`planForDay`)
- Sem bloqueio pós-nocturno (D+1, F+2)
- Não ultrapassou limite mensal de nocturnos
- Sem restrição ao turno (`turnoRestr`)

**Bloqueo pós-nocturno:**
Quando um aux é atribuído a um turno N no dia `d`:
- Dia `d+1` → bloqueado (Descanso automático)
- Dia `d+2` → bloqueado (Folga automática)

### Fase 3: Preenchimento Final (linhas 852-877)

Para cada auxiliar, para cada dia do mês:
1. Se já tem ausência → **pular**
2. Se já tem entrada manual → **pular**
3. Se já tem entrada pendente (de Descanso/Folga pós-N) → **pular**
4. Se tem turno planeado na Fase 2 → **inserir turno**
   - Se turno é nocturno → adicionar D (d+1) e F (d+2)
5. Se não tem plano → **inserir Folga (F)**
   - Excepção: aux que só trabalha dias úteis não recebe F em FDS

### Inserção em Lote (linhas 879-903)

- Insere em batches de 25 registos
- Actualiza UI progressivamente (barra de progresso + log)
- Flash visual nas células preenchidas
- Cria estado de undo para reverter toda a geração

---

## Fluxo Visual do Botão

```
[Gerar Escala] click
    ↓
gerarEscalaMensal()
    ↓
Carregar restrições + ausências da BD
    ↓
setGenerating(true) + mostra barra progresso
    ↓
Para cada dia do mês:
  ├─ Calcular cobertura necessária (N:2, M:8, T:7)
  ├─ Filtrar aux elegíveis (sem ausência, sem restrição, etc.)
  ├─ Ordenar por distribuição justa (menos turnos primeiro)
  └─ Atribuir turnos até cobrir necessidades
    ↓
Para cada aux × dia sem plano:
  ├─ Se tem turno planeado → inserir turno
  ├─ Se turno é N → adicionar D+F automáticos
  └─ Se não tem plano → inserir Folga
    ↓
INSERT em batches de 25 → BD
    ↓
Actualizar UI + undo state
    ↓
setGenerating(false)
```

---

## Lógica de Botões Relacionados

| Botão | Ação | Função |
|-------|------|--------|
| "Gerar Escala" | Gera escala automática para o mês | `gerarEscalaMensal()` |
| "Desfazer" (undo) | Reverte a última geração | Remove `undoState.inserted`, restaura `undoState.deleted` |
| "Limpar Mês" | Remove TODAS as entradas do mês | `limparMes()` — DELETE por data range + tipo_escala="mensal" |

## Dependências
- `useConfig().horarios` — regras (max turnos N por mês, etc.)
- `turnos` — lista de turnos da BD com classificação M/T/N
- `auxiliares` (sortedAuxiliares) — lista ordenada por nome
- `escalas` — entradas manuais existentes (não sobrescritas)
- `restricoes` — restrições aux↔turno
- `ausencias` — ausências registadas (férias, licença, etc.)

## Notas Importantes
- A geração **nunca sobrescreve** entradas manuais existentes
- O algoritmo é **coverage-first**: garante cobertura mínima antes de distribuir restantes
- A distribuição é **justa**: aux com menos turnos têm prioridade
- Após N nocturno → D (Descanso) e F (Folga) são inseridos automaticamente
- O undo permite reverter toda a geração de uma vez
