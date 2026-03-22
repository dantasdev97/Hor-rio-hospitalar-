---
tags: [bugfix, escala-semanal, exam1, multi-pessoa, derivação]
updated: 2026-03-22
---

# 27 — Fix: ECO URG (EXAM1) Células Multi-Pessoa

> [[00 - MOC (Índice)|← Índice]]
> Corrigido: 2026-03-22

## 🐛 Problema

Na [[07 - Escala Semanal]], as células **EXAM1** (ECO URG) para turnos **M** e **T** aceitam até 2 auxiliares. Mas quando os auxiliares vinham da **derivação mensal** (via `mensalAssignMap`), era impossível:
1. **Limpar** a célula (botão "Remover" não aparecia)
2. **Trocar** os auxiliares atribuídos
3. Guardar com seleção **vazia** (bloqueava silenciosamente)

> O mesmo problema afectava TRANSPORT+M (também multi-pessoa).

---

## 🔍 Causa Raiz

### Bug 1 — `hasExisting` ignorava derivação mensal

```typescript
// ANTES (errado): só verificava registos semanal reais
const hasExisting = isDouble
  ? escalas.some(e => e.data===selCell?.data && e.turno_letra===selCell?.turnoLetra
      && e.posto===selCell?.posto && !e.id.startsWith("mensal_"))
  : ...
```

Quando os aux vinham de `mensalAssignMap` (IDs como `"mensal_XXXX"`), `hasExisting = false` → o botão **"Remover"** nunca aparecia.

### Bug 2 — `clearEscala` não apagava entradas mensais

```typescript
// ANTES: só apagava registos semanal reais
for (const row of rows) await supabase.from("escalas").delete().eq("id", row.id)
// ← As entradas mensais ficavam intactas → auxiliares voltavam a aparecer
```

### Bug 3 — `saveEscala` bloqueava com seleção vazia

```typescript
// ANTES: bloqueia quando selPersonIds está vazio
if (isDouble && selPersonIds.length === 0) return  // ← não fazia nada
```

O utilizador clicava "Limpar seleção" → `selPersonIds = []` → tentava guardar → bloqueava silenciosamente.

---

## ✅ Solução Aplicada

### Fix 1 — `hasExisting` agora verifica derivados

```typescript
// Registos semanal reais
const hasExistingDoubleReal = !!(isDouble && selCell &&
  escalas.some(e => e.data===selCell.data && e.turno_letra===selCell.turnoLetra
    && e.posto===selCell.posto && !e.id.startsWith("mensal_")))

// Derivados da escala mensal (mensalAssignMap)
const hasExistingDoubleDerived = !!(isDouble && selCell &&
  (mensalAssignMap.get(`${selCell.data}|${selCell.turnoLetra}|${selCell.posto}`) ?? []).length > 0)

// Combinação: botão "Remover" aparece em ambos os casos
const hasExisting = isDouble
  ? (hasExistingDoubleReal || hasExistingDoubleDerived)
  : !!(_existingEsc && !_existingEsc.id.startsWith("mensal_"))
```

### Fix 2 — `clearEscala` agora apaga entradas mensais derivadas

```typescript
if (isMultiPerson(selCell.posto, selCell.turnoLetra)) {
  // 1. Apagar registos semanal reais
  const rows = escalas.filter(e =>
    e.data===selCell.data && e.turno_letra===selCell.turnoLetra
    && e.posto===selCell.posto && !e.id.startsWith("mensal_"))
  setEscalas(p => p.filter(e => !rows.some(r => r.id === e.id)))
  for (const row of rows) await supabase.from("escalas").delete().eq("id", row.id)

  // 2. NOVO: Apagar entradas mensais dos aux derivados para esta célula
  const derivedAuxIds = mensalAssignMap.get(
    `${selCell.data}|${selCell.turnoLetra}|${selCell.posto}`
  ) ?? []
  for (const auxId of derivedAuxIds) {
    const mensalEntry = mensalEntries.find(
      me => me.auxiliar_id === auxId && me.data === selCell.data
    )
    if (mensalEntry) {
      await supabase.from("escalas").delete().eq("id", mensalEntry.id)
      setMensalEntries(p => p.filter(me => me.id !== mensalEntry.id))
    }
  }
  return
}
```

### Fix 3 — `saveEscala` delega para `clearEscala` com seleção vazia

```typescript
// ANTES:
if (isDouble && selPersonIds.length === 0) return

// DEPOIS: trata vazio como "limpar tudo"
if (isDouble && selPersonIds.length === 0) { await clearEscala(); return }
```

---

## 🔄 Fluxo Corrigido

### Cenário: EXAM1+T com 2 auxiliares derivados [A, B]

```
Abrir célula → selPersonIds = ["A", "B"]
Clicar "Remover" → clearEscala()
  ├─ Apaga registos semanal reais (se existirem)
  └─ Apaga mensalEntries de A e B para esta data
→ Célula fica vazia ✅
```

### Cenário: EXAM1+M com 1 aux derivado [A], quer trocar por [C]

```
Abrir célula → selPersonIds = ["A"]
Desmarcar A → selPersonIds = []
Marcar C → selPersonIds = ["C"]
Guardar → saveEscala()
  ├─ existingRows = [] (nenhum real)
  ├─ newIds = ["C"]
  └─ Insere C como registo semanal real
→ getEscalas retorna [C] (path manual prevalece) ✅
→ A já não aparece (derivação sobreposta pelo manual) ✅
```

---

## 📋 Células Multi-Pessoa no Sistema

| Posto + Turno | Max | Fix Aplicado |
|---|---|---|
| **EXAM1 + M** | 2 | ✅ |
| **EXAM1 + T** | 2 | ✅ |
| TRANSPORT + M | 2 | ✅ (mesmo código) |
| EXAM2 + M | 3 | ✅ (mesmo código) |

> Ver [[19 - Postos e Turnos]] — tabela de máximo de pessoas por célula.

---

## 🔗 Ver Também

- [[07 - Escala Semanal]] — Lógica completa de `mensalAssignMap` e `getEscalas`
- [[19 - Postos e Turnos]] — Postos multi-pessoa e suas regras
- [[06 - Escala Mensal]] — Origem das entradas mensais (derivação)
- [[23 - Histórico Git]] — Commit deste fix
