---
tags: [algoritmo, geração, automático, coverage-first]
updated: 2026-03-21
---

# 16 — Algoritmo de Geração Automática

> [[00 - MOC (Índice)|← Índice]]
> Função: `gerarEscalaMensal()` em `src/pages/EscalaMensal.tsx`

## 🎯 Objectivo

Gerar automaticamente a escala mensal garantindo:
1. **Cobertura mínima** por tipo de turno em cada dia
2. **Distribuição justa** — quem tem menos turnos é escalado primeiro
3. **Respeito por restrições** e ausências
4. **Regras pós-noturno** — D (descanso) e F (folga) automáticos

---

## 📋 Cobertura Necessária por Dia

| Dia | Turno N | Turno M | Turno T |
|---|---|---|---|
| Domingo | 2 | 3 | 3 |
| Segunda a Sábado | 2 | 8 | 7 |

---

## 🔄 Algoritmo Passo a Passo

### Fase 0 — Preparação
```
1. Limpa escalas existentes (exceto Fe, FAA, L, Aci)
2. Carrega restrições do mês: restricoes[]
3. Carrega ausências do mês: ausencias[]
4. Constrói mapas de bloqueio:
   - turnoRestr: Map<auxId, Set<turnoId>>  → turnos proibidos
   - ausBlocked: Map<"${auxId}_${dateStr}", codigoEspecial>  → dias bloqueados
```

### Fase 1 — Coverage-First Planning
```
Para cada dia do mês (1 a N):
  Para cada turno letra [N, M, T]:

    Filtra auxiliares elegíveis:
      ✓ disponivel = true
      ✓ trabalha_fds = true (se fim de semana)
      ✗ bloqueado por ausência neste dia
      ✗ já atribuído hoje
      ✗ turno está nas suas restrições
      ✗ (só para N) já atingiu maxTurnosNoturnosMes

    Ordena por: count de turnos já planeados (menos primeiro)

    Atribui: min(elegíveis, necessários) auxiliares

    Para cada N atribuído:
      Bloqueia dia+1 com código "D" (descanso pós-noturno)
      Bloqueia dia+2 com código "F" (folga)
```

### Fase 2 — Preenchimento
```
Para cada auxiliar:
  Para cada dia do mês:
    Se tem turno planeado → atribui turno_id
    Se nocturno → adiciona D no dia+1, F no dia+2
    Se não tem planeamento → atribui F (folga)
```

### Fase 3 — Inserção em Batch
```
Insere em batches de 25 registos
70ms delay entre batches (não sobrecarregar API)
Actualiza genProgress {current, total}
Adiciona entradas ao genLog (log visual)
flashCell() em cada célula inserida
```

---

## 🧮 Distribuição Justa

O ordenamento `sort by count ascending` garante que quem tem **menos turnos** é **sempre escalado primeiro**. Isto distribui equitativamente ao longo do mês.

```typescript
elegíveis.sort((a, b) => contagem[a.id] - contagem[b.id])
```

---

## 🔒 Verificações de Restrição

```typescript
// turnoRestr.get(auxId)?.has(turnoId)
// → auxiliar não pode fazer este turno (tipo/horário)

// ausBlocked.get(`${auxId}_${dateStr}`)
// → dia bloqueado por ausência (L, Aci, Fe, FAA, ou D/F gerados)
```

---

## ♻️ Limpeza (limparMensal)

```typescript
// Apaga APENAS entradas sem código de ausência importante
// Preserva: Fe, FAA, L, Aci
// Apaga: D, F, turnos normais
// Batch de 50 por request
```

---

## ↩️ Desfazer (reverter)

```typescript
// UndoState guarda:
//   inserted: IDs inseridos → DELETE
//   deleted: EscalaRows → re-INSERT
// Reverte a última geração ou limpeza
```

---

## 🔗 Ver Também

- [[06 - Escala Mensal]] — Página que contém o algoritmo
- [[18 - Códigos Especiais]] — D, F e os códigos preservados
- [[11 - Restrições]] — Como as restrições são carregadas
- [[21 - Configurações LocalStorage]] — maxTurnosNoturnosMes, maxTurnosMes
