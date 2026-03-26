---
tags: [configurações, settings, config-context]
updated: 2026-03-26
---

# Configurações

## Descrição
Página de configurações do sistema com 3 tabs: Empresa, Horários e Sistema. Todas as configurações são persistidas na base de dados Supabase (tabela `configuracoes`) via `ConfigContext`.

## Ficheiros
- `src/pages/Configuracoes.tsx` — componente principal (~600 linhas)
- `src/contexts/ConfigContext.tsx` — contexto global de configurações

## Funcionalidades
- [x] Tab Empresa: nome, departamento, telefone, email, logo (upload base64, max 200KB)
- [x] Tab Horários: regras de escala (turnos consecutivos, descanso, limites semanais/mensais)
- [x] Tab Sistema: verificação de BD (testa conexão e lista tabelas)
- [x] Persistência na BD via `useConfig()` → `saveEmpresa()` / `saveHorarios()`
- [x] Logo refletido na Sidebar em tempo real
- [x] Error handling com rollback: se o upsert falhar, estado local reverte ao valor anterior
- [x] Feedback de erro visual (banner vermelho antes do botão Guardar)
- [x] Perfil do coordenador (Sidebar modal) com mesmo padrão de error handling

## Lógica de Botões

| Botão | Ação | Função |
|-------|------|--------|
| "Guardar" (Empresa) | Persiste config empresa na BD | `handleSaveEmpresa()` → `saveEmpresa(form)` |
| "Guardar" (Horários) | Persiste regras de horário na BD | `handleSaveHorarios()` → `saveHorarios(form)` |
| Upload Logo | Abre file picker, converte para base64 | `handleLogoChange()` (max 200KB) |
| "Remover" Logo | Limpa logo do form | `update("logo", null)` |
| "Verificar Sistema" | Abre modal com checks de BD | `runChecks()` |

## Fluxo de Dados
```
BD (configuracoes) → ConfigContext.load() → useConfig() → Componente → UI
UI input → setForm() → handleSave() → saveEmpresa/saveHorarios() → BD upsert
                                         ↓ (se erro)
                                         rollback setState(prev) + mostrar errorMsg
```

## Error Handling (2026-03-26)

Todas as funções save retornam `Promise<SaveResult>`:

```ts
interface SaveResult { success: boolean; error?: string }
```

**Padrão de rollback (ConfigContext):**
1. Guardar valor anterior: `const prev = empresa`
2. setState optimístico: `setEmpresa(c)`
3. `await supabase.upsert(...)` dentro de try/catch
4. Se `error` → rollback `setEmpresa(prev)` + retorna `{ success: false, error }`
5. Se ok → retorna `{ success: true }`

**UI (Configuracoes.tsx + Sidebar PerfilModal):**
- Estado `errorMsg: string | null` em cada tab/modal
- Se `!result.success` → `setErrorMsg(result.error)` + não mostra "Guardado!"
- Banner vermelho com `AlertCircle` antes do botão Guardar
- Limpa erro ao iniciar novo save

## Tabela BD: `configuracoes`
| chave | valor (JSONB) |
|-------|---------------|
| `empresa` | `{nome, departamento, telefone, email, logo}` |
| `horarios` | `{bloquearTurnosConsecutivos, horasDescansMinimas, maxTurnosSemana, ...}` |

## Migração de localStorage (2026-03-22)
- Anteriormente usava `localStorage` com chaves `cfg_empresa` e `cfg_horarios`
- Migrado para tabela `configuracoes` na BD Supabase
- `ConfigContext` carrega no mount e expõe via hook `useConfig()`
