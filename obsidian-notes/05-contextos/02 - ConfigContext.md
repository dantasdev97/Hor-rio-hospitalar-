# ConfigContext

## Descrição
Contexto global que carrega e persiste configurações (empresa, horários) e perfil do coordenador na base de dados Supabase.

## Ficheiros
- `src/contexts/ConfigContext.tsx` — provider e hook (~166 linhas)

## Interface

```typescript
interface ConfigContextValue {
  empresa: EmpresaConfig        // nome, departamento, telefone, email, logo
  horarios: HorariosConfig      // regras de escala (limites, descanso, etc.)
  perfil: PerfilCoordenador     // nome, telemóvel, nº mec., foto
  loadingConfig: boolean
  saveEmpresa: (c: EmpresaConfig) => Promise<void>
  saveHorarios: (c: HorariosConfig) => Promise<void>
  savePerfil: (p: PerfilCoordenador) => Promise<void>
}
```

## Fluxo de Dados
```
App mount → ConfigProvider → useEffect → load()
  1. SELECT * FROM configuracoes → parse empresa + horarios
  2. SELECT FROM perfil_coordenador WHERE user_id = auth.uid()
  3. setState com dados ou defaults

save*() → setState + upsert na BD
```

## Tabelas BD
- `configuracoes` — chave/valor JSONB (`empresa`, `horarios`)
- `perfil_coordenador` — 1 registo por utilizador (`user_id` UNIQUE)

## Dependências
- `useAuth()` — para obter `user.id`
- `supabase` client

## Consumidores
- `Sidebar.tsx` — logo, nome empresa, perfil coordenador
- `Configuracoes.tsx` — leitura/escrita empresa e horários
- `EscalaMensal.tsx` — regras de horários para geração
- `EscalaSemanal.tsx` — regras de horários
