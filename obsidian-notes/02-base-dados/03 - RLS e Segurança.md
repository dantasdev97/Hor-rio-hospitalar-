# RLS e Segurança

## Descrição
Políticas de Row Level Security (RLS) do Supabase que controlam o acesso aos dados.

## Estado Actual

### Migração: `20260322_fix_rls_policies.sql`
Substitui as políticas `allow_all` (abertas) por políticas baseadas em autenticação.

| Tabela | Política | Regra |
|--------|----------|-------|
| auxiliares | `auth_auxiliares` | `auth.role() = 'authenticated'` |
| doutores | `auth_doutores` | `auth.role() = 'authenticated'` |
| turnos | `auth_turnos` | `auth.role() = 'authenticated'` |
| doutor_turnos | `auth_doutor_turnos` | `auth.role() = 'authenticated'` |
| escalas | `auth_escalas` | `auth.role() = 'authenticated'` |
| restricoes | `auth_restricoes` | `auth.role() = 'authenticated'` |
| configuracoes | `auth_configuracoes` | `auth.role() = 'authenticated'` |
| perfil_coordenador | `perfil_own_user` | `user_id = auth.uid()` |

### Notas
- Tabelas partilhadas (doutores, auxiliares, turnos, escalas): acesso total para qualquer utilizador autenticado
- `perfil_coordenador`: cada utilizador só acede ao próprio perfil
- A `anon key` do Supabase **não permite** acesso sem login

## Ficheiros de Migração
- `supabase/migrations/20260308_create_hospital_tables.sql` — tabelas base + RLS habilitado
- `supabase/migrations/20260316_add_postos_to_turnos.sql` — coluna postos[]
- `supabase/migrations/20260322_add_configuracoes_perfil.sql` — configuracoes + perfil
- `supabase/migrations/20260322_fix_rls_policies.sql` — políticas seguras

## Como Executar Migrações
1. Abrir Supabase SQL Editor: https://supabase.com/dashboard/project/rijonndemwuxihrzzmru/sql
2. Copiar conteúdo do ficheiro `.sql`
3. Executar e verificar resultado
