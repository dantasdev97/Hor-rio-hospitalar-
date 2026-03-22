# Bugs Conhecidos

## Descrição
Lista de bugs identificados na análise profunda do sistema (2026-03-22).

## Corrigidos nesta sessão

| Bug | Severidade | Ficheiro | Correção |
|-----|-----------|----------|----------|
| Supabase client sem validação de env vars | Crítico | `supabaseClient.ts` | Adicionado throw com mensagem explicativa |
| RLS policies `allow_all` (acesso aberto) | Crítico | Migração SQL | Nova migração com `auth.role() = 'authenticated'` |
| Base64 ilimitado para fotos/logos | Alto | `Sidebar.tsx`, `Configuracoes.tsx` | Limite de 200KB no frontend |
| `Promise.all` sem try/catch | Alto | `EscalaSemanal.tsx` | Adicionado try/catch + alert de erro |
| Type casts `as unknown as Record` | Médio | `ConfigContext.tsx` | Substituído por `satisfies` |
| Error parsing com `.includes()` | Baixo | `AuthContext.tsx` | Substituído por `error.status` e `error.code` |

## Pendentes

| Bug | Severidade | Ficheiro | Descrição |
|-----|-----------|----------|-----------|
| `POSTO_SCHEDULE` hardcoded | Médio | `EscalaSemanal.tsx` | Fallback estático para regras de postos — deveria vir 100% da BD |
| Fotos base64 na BD | Médio | `perfil_coordenador`, `configuracoes` | Migrar para Supabase Storage no futuro |
| Sem error boundaries | Baixo | `App.tsx` | React error boundary global para crashes |
| Loading states inconsistentes | Baixo | Várias páginas | Padrão de loading/skeleton não uniforme |

## Melhorias Futuras
- Extrair constantes mágicas para ficheiro de configuração
- Unificar padrão de toast/notificações
- Adicionar testes unitários
