---
tags: [equipas, auxiliares, organização, escala-mensal]
updated: 2026-03-22
---

# 25 — Equipas de Auxiliares

> [[00 - MOC (Índice)|← Índice]]
> Implementado: 2026-03-22

## 🎯 O Que É

Cada [[08 - Auxiliares|auxiliar]] pertence a uma de 3 equipas fixas. Isso permite:
1. Agrupar visualmente a [[06 - Escala Mensal]] por equipa (com cabeçalhos separadores)
2. Filtrar e identificar rapidamente quem é de que equipa
3. Organização fiel à escala real impressa em papel

---

## 🏷️ As 3 Equipas

```typescript
const EQUIPAS = ['Equipa 1', 'Equipa 2', 'Equipa Transportes'] as const
type EquipaType = typeof EQUIPAS[number]
```

| Equipa | Descrição |
|---|---|
| **Equipa 1** | Primeiro grupo de auxiliares (menor nº mecanográfico) |
| **Equipa 2** | Segundo grupo de auxiliares |
| **Equipa Transportes** | Auxiliares especializados em transportes |

---

## 🗄️ Base de Dados

Migração: `supabase/migrations/20260321_add_equipa_to_auxiliares.sql`

```sql
ALTER TABLE auxiliares
ADD COLUMN IF NOT EXISTS equipa text
  CHECK (equipa IN ('Equipa 1', 'Equipa 2', 'Equipa Transportes'));
```

- Campo nullable (auxiliares sem equipa atribuída são permitidos)
- Constraint CHECK garante só valores válidos
- Ver [[04 - Base de Dados]] — tabela `auxiliares`

---

## 📦 Tipo TypeScript

Em [[05 - Tipos TypeScript]] — interface `Auxiliar`:

```typescript
export interface Auxiliar {
  id: string
  nome: string
  email: string | null
  numero_mecanografico: string | null
  contribuinte: string | null
  disponivel: boolean
  trabalha_fds: boolean
  equipa: 'Equipa 1' | 'Equipa 2' | 'Equipa Transportes' | null  // ← novo
  created_at: string
}
```

---

## 🖥️ Modal de Cadastro/Edição (Auxiliares.tsx)

Ver [[08 - Auxiliares]] — novos campos e estado:

```typescript
// Estado adicional
const [selectedEquipa, setSelectedEquipa] = useState<EquipaType | null>(null)

// Schema Zod actualizado
const schema = z.object({
  nome: z.string().min(1),
  email: z.string().email().or(z.literal("")),
  numero_mecanografico: z.string().optional(),
  contribuinte: z.string().optional(),
  equipa: z.enum(['Equipa 1', 'Equipa 2', 'Equipa Transportes']).nullable().optional(),
})
```

**Dropdown no formulário:**
```tsx
<select value={selectedEquipa ?? ""} onChange={e => setSelectedEquipa(e.target.value || null)}>
  <option value="">Sem equipa</option>
  <option value="Equipa 1">Equipa 1</option>
  <option value="Equipa 2">Equipa 2</option>
  <option value="Equipa Transportes">Equipa Transportes</option>
</select>
```

**Payload com equipa:**
```typescript
const payload = {
  nome, email, numero_mecanografico, contribuinte,
  equipa: selectedEquipa   // guardado no Supabase
}
```

---

## 📊 Agrupamento na Escala Mensal

Ver [[06 - Escala Mensal]] — substituição de `sortedAuxiliares` por `groupedAuxiliares`:

```typescript
const EQUIPAS_ORDER = ['Equipa 1', 'Equipa 2', 'Equipa Transportes'] as const

const groupedAuxiliares = useMemo(() => {
  // Ordenação global por nº mecanográfico crescente
  const sorted = [...auxiliares].sort((a, b) => {
    const na = parseInt(a.numero_mecanografico ?? '999999', 10) || 999999
    const nb = parseInt(b.numero_mecanografico ?? '999999', 10) || 999999
    return na - nb
  })
  // Grupos por equipa
  const groups = EQUIPAS_ORDER
    .map(equipa => ({ equipa, membros: sorted.filter(a => a.equipa === equipa) }))
    .filter(g => g.membros.length > 0)
  // Auxiliares sem equipa no fim
  const semEquipa = sorted.filter(a => !a.equipa)
  if (semEquipa.length > 0) groups.push({ equipa: "Sem Equipa", membros: semEquipa })
  return groups
}, [auxiliares])
```

### Rendering com cabeçalhos:

```tsx
{groupedAuxiliares.map(({ equipa, membros }) => (
  <>
    {/* Cabeçalho separador — fundo cinzento, bold */}
    <tr key={`header-${equipa}`}>
      <td colSpan={days.length + 2} style={{
        background: "#D9D9D9", fontWeight: 700, textAlign: "center",
        fontSize: 10, padding: "4px 0",
        borderTop: "2px solid #999", borderBottom: "1px solid #BBB"
      }}>
        {equipa}
      </td>
    </tr>
    {/* Linhas dos auxiliares desta equipa */}
    {membros.map((aux, idx) => (
      <tr key={aux.id}>
        {/* ... células normais ... */}
      </tr>
    ))}
  </>
))}
```

### Resultado Visual:

```
┌────────────────────────────── Equipa 1 ──────────────────────────────┐
│ 988   EDUARDO AZOIA    │ D │T21│T21│ D │ F │T21│...                  │
│ 1183  MARIA FÁTIMA     │ D │ M7│ M7│ M7│ D │ M7│...                  │
│ 1318  ANA MARIA SANTOS │ D │ M7│ M7│ F │ L │ L │...                  │
├────────────────────────────── Equipa 2 ──────────────────────────────┤
│ 1991  EURICO AFONSO    │ F │ F │ M9│T15│ D │ N5│...                  │
│ 4747  LUIS ISIDRO      │ D │ F │T21│ D │ N5│ N5│...                  │
├──────────────────────────── Equipa Transportes ──────────────────────┤
│ 3062  ELISABETE LOURENÇO│ D │ F │ M7│ M7│ M7│ D │...                 │
│ 5232  JOANA LEAL       │ D │ L │ L │ L │ L │ L │...                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Regras de Ordenação

Dentro de cada equipa, os auxiliares são ordenados por **número mecanográfico crescente**:
- Mecanográfico `null` ou não numérico → tratado como `999999` (vai para o fim)
- Exemplo: 988 → 1183 → 1318 → 1597 → 1615...

---

## 🔗 Ver Também

- [[08 - Auxiliares]] — CRUD e modal de cadastro
- [[06 - Escala Mensal]] — Visualização agrupada por equipa
- [[05 - Tipos TypeScript]] — Interface Auxiliar com campo equipa
- [[04 - Base de Dados]] — Migração SQL e tabela auxiliares
- [[19 - Postos e Turnos]] — Outros conceitos de organização
- [[23 - Histórico Git]] — Commit desta feature
