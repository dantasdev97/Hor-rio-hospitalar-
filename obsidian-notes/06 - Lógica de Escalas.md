# Lógica de Escalas

> Algoritmos e regras de negócio dos ficheiros `EscalaMensal.tsx` e `EscalaSemanal.tsx`.

---

## Detecção de Turno Noturno

```typescript
// src/pages/EscalaMensal.tsx — linha ~39
function isNoturnoTurno(t: Turno): boolean {
  // Prioridade 1: nome começa por "N" → sempre noturno (ex: N5, N noite)
  if (t.nome.toUpperCase().startsWith("N")) return true
  // Prioridade 2: fallback por horario_inicio se disponível
  if (t.horario_inicio && t.horario_inicio !== "00:00") return t.horario_inicio >= "20:00"
  return false
}
```

> **Importante:** O nome tem prioridade sobre o horário. Isto evita falsos negativos quando `horario_inicio` está mal configurado na BD.

---

## Letra do Turno

```typescript
function getTurnoLetraMensal(t: Turno): "M" | "T" | "N" | null {
  if (isNoturnoTurno(t)) return "N"
  const n = t.nome.toUpperCase()
  if (n.startsWith("MT")) return null   // turno misto — ignora
  if (n.startsWith("M"))  return "M"
  if (n.startsWith("T"))  return "T"
  return null
}
```

---

## Cálculo de Descanso Entre Turnos

```typescript
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function restHoursBetween(
  prev: { horario_inicio: string; horario_fim: string },
  nextInicio: string
): number {
  // Turno noturno cruza meia-noite (fim < início), ex: 21:00–07:00
  // Nesse caso, o fim já está no dia d+1
  const crossesDay = prevEnd < prevStart
  const gapMin = crossesDay
    ? nextStart - prevEnd            // simples
    : nextStart + 1440 - prevEnd     // adiciona 24h
  return gapMin / 60
}
```

---

## Cor Automática de Turno

```typescript
function deriveTurnoColor(nome: string): { bg: string; text: string } {
  const n = nome.toUpperCase()
  if (n.startsWith("MT"))                              return { bg: "#BAE6FD", text: "#0C4A6E" }  // Ciano
  if (n.startsWith("TAC") || n.startsWith("ECO") || n.startsWith("RX"))
                                                        return { bg: "#D9F99D", text: "#365314" }  // Verde-lima
  if (n.startsWith("T"))                               return { bg: "#FECDD3", text: "#881337" }  // Rosa
  if (n.startsWith("M"))                               return { bg: "#FEF08A", text: "#713F12" }  // Amarelo
  if (n.startsWith("N"))                               return { bg: "#C7D2FE", text: "#3730A3" }  // Azul índigo
  return { bg: "#F3F4F6", text: "#374151" }                                                       // Cinza
}
```

---

## Geração Automática (EscalaMensal)

### Contagens Necessárias por Dia
```typescript
function getRequiredCounts(dow: number): { N: number; M: number; T: number } {
  if (dow === 0) return { N: 2, M: 3, T: 3 }   // Domingo
  return { N: 2, M: 8, T: 7 }                   // Segunda a Sábado
}
```

**Justificação:**
- N: sempre 2 (RX URG + TAC 2)
- Domingo: menos postos activos → M:3, T:3
- Semana/Sábado: todos os postos → M:8, T:7

### Algoritmo (Coverage-First)
1. Para cada dia do mês (em ordem):
   - Para cada letra N → M → T:
     - Filtrar auxiliares elegíveis (disponíveis, sem restrições, sem bloqueio pós-noturno, sem exceder limites)
     - Ordenar por: (N) menos turnos noturnos / (M/T) menos turnos planeados
     - Atribuir os necessários ao turno com menos utilização nesse dia
2. Para auxiliares sem atribuição nesse dia → Folga (F)
3. Após noturno no dia D: bloquear D+1 (Descanso) e D+2 (Folga)

### Regra Post-Noturno
```
Turno N no dia D
  → D + 1: código "D" (Descanso)
  → D + 2: código "F" (Folga)
```

---

## Regras de Distribuição Justa

- **Noturnos:** ordenar por auxiliar com menos turnos N no mês
- **M/T:** ordenar por auxiliar com menos turnos totais planeados
- Reutilização do mesmo turno permitida (ex: 2 auxiliares no N5)
- Turno com menos utilizações no dia tem prioridade (distribuição entre sub-turnos)

---

## Sync em Tempo Real

```typescript
// Escuta mudanças na tabela escalas (ex: edições feitas na escala semanal)
supabase.channel(`mensal-live-${year}-${month}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'escalas' },
    (payload) => {
      const row = payload.new ?? payload.old
      if (row?.tipo_escala === 'mensal' && row?.data) {
        const d = new Date(row.data + 'T12:00:00')
        if (d.getFullYear() === year && d.getMonth() === month) fetchAll()
      }
    })
  .subscribe()
```

---

## Notas Relacionadas

- [[05 - Tipos TypeScript]]
- [[07 - Códigos Especiais]]
- [[08 - Configurações]]
- [[09 - Erros e Alertas]]

#algoritmo #escalas #regras #geração
