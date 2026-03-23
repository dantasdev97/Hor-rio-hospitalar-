---
tags: [configurações, settings, empresa, perfil, bd]
updated: 2026-03-22
---

# 13 — Configurações

> [[00 - MOC (Índice)|← Índice]]
> Ficheiro: `src/pages/Configuracoes.tsx`

## 🎯 O Que Faz

Página de configurações com 3 tabs:
1. **Empresa** — Nome, departamento, logo, contactos (guardado na BD)
2. **Horários** — Regras de escala e limites (guardado na BD)
3. **Sistema** — Diagnóstico da base de dados e ambiente

---

## 🏗️ Arquitetura (atualizada 2026-03-22)

As configurações já **não usam localStorage**. São persistidas na BD via `ConfigContext`.

```
src/contexts/ConfigContext.tsx  ← contexto global
├── Carrega da tabela `configuracoes` (BD)
├── Carrega da tabela `perfil_coordenador` (BD)
└── Expõe: empresa, horarios, perfil, saveEmpresa(), saveHorarios(), savePerfil()
```

O contexto é injetado em `App.tsx`:
```tsx
<AuthProvider>
  <ConfigProvider>
    <AppRoutes />
  </ConfigProvider>
</AuthProvider>
```

---

## 🏢 Tab: Empresa

Guardado na tabela `configuracoes` com chave `'empresa'` (JSONB).

```typescript
interface EmpresaConfig {
  nome: string          // Default: "Hospital Leiria CHL"
  departamento: string  // Default: "Imagiologia"
  telefone: string
  email: string
  logo: string | null   // Base64 da imagem
}
```

**Logo:**
- Formato base64, máx. 2MB
- Após guardar, reflete imediatamente na **sidebar** (logo dinâmica)
- O nome do hospital aparece também no topo da sidebar

---

## ⏰ Tab: Horários

Guardado na tabela `configuracoes` com chave `'horarios'` (JSONB).

```typescript
interface HorariosConfig {
  bloquearTurnosConsecutivos: boolean  // Default: true
  horasDescansMinimas: number          // Default: 11h
  maxTurnosSemana: number              // Default: 5
  maxTurnosNoturnos: number            // Default: 2 (por semana)
  alertasConflito: boolean             // Default: true
  permitirSubstituicoes: boolean       // Default: false
  maxTurnosMes: number                 // Default: 22
  maxTurnosNoturnosMes: number         // Default: 4
}
```

**Reflete nas escalas:** `EscalaMensal` e `EscalaSemanal` lêem `horarios` via `useConfig()` — não há mais leitura direta de localStorage.

---

## 👤 Perfil do Coordenador

Guardado na tabela `perfil_coordenador` (1 registo por `auth.uid()`).

```typescript
interface PerfilCoordenador {
  nome: string
  telemovel: string
  numero_mecanografico: string
  foto: string | null  // base64
}
```

**Acesso:** Botão clicável no rodapé da sidebar → abre modal com formulário de perfil.

---

## 🖥️ Tab: Sistema

Verifica estado de cada tabela e variáveis de ambiente:

| Item verificado              | O Que Testa                                    |
|---|---|
| Ligação ao Supabase          | SELECT do Supabase                             |
| Tabela `auxiliares`          | count(*)                                       |
| Tabela `turnos`              | count(*)                                       |
| Tabela `doutores`            | count(*)                                       |
| Tabela `restricoes`          | count(*)                                       |
| Tabela `escalas`             | count(*)                                       |
| Tabela `configuracoes`       | count(*) — nova tabela                         |
| Tabela `perfil_coordenador`  | count(*) — nova tabela                         |
| `VITE_SUPABASE_URL`          | `import.meta.env.VITE_SUPABASE_URL` definida  |
| `VITE_SUPABASE_ANON_KEY`     | `import.meta.env.VITE_SUPABASE_ANON_KEY`      |

---

## 📋 Tabelas BD Novas (migração 20260322)

```sql
-- Configurações globais
CREATE TABLE configuracoes (
  chave text PRIMARY KEY,   -- 'empresa' | 'horarios'
  valor jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Perfil do coordenador
CREATE TABLE perfil_coordenador (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  nome text,
  telemovel text,
  numero_mecanografico text,
  foto text,   -- base64
  updated_at timestamptz,
  UNIQUE(user_id)
);
```

---

## 🔗 Ver Também

- [[21 - Configurações LocalStorage]] — documentação obsoleta (localStorage já não usado)
- [[17 - Sistema de Alertas]] — como `horarios` afecta os alertas
- [[16 - Algoritmo de Geração]] — como `horarios` afecta a geração
