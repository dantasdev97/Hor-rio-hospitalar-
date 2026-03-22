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
```

## Tabela BD: `configuracoes`
| chave | valor (JSONB) |
|-------|---------------|
| `empresa` | `{nome, departamento, telefone, email, logo}` |
| `horarios` | `{bloquearTurnosConsecutivos, horasDescansMinimas, maxTurnosSemana, ...}` |

## Migração de localStorage (2026-03-22)
- Anteriormente usava `localStorage` com chaves `cfg_empresa` e `cfg_horarios`
- Migrado para tabela `configuracoes` na BD Supabase
- `ConfigContext` carrega no mount e expõe via hook `useConfig()`
