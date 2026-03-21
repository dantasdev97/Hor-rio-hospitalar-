# Páginas e Rotas

> Todas as páginas da aplicação, o que fazem e as funções principais.

---

## EscalaMensal.tsx
**Rota:** `/escala-mensal`
**Tamanho:** ~68 KB | ~1300 linhas

Vista de calendário mensal com todos os auxiliares e dias do mês.

### Funcionalidades
- Navegação mês a mês (← →, botão "Este mês")
- Clique em célula → modal para atribuir turno ou código especial
- Geração automática de escala (`Gerar Escala`)
- Limpar o mês (com confirmação)
- Reverter última geração (Undo)
- Exportar PDF vectorial (jsPDF + autoTable)
- Imprimir (nova janela)
- Partilhar no WhatsApp (html2canvas → clipboard)
- Painel de alertas reactivo (secções colapsáveis)
- Sync em tempo real via Supabase Realtime

### Funções Chave
| Função | O que faz |
|--------|-----------|
| `isNoturnoTurno(t)` | Verifica se turno é noturno (prioriza nome "N...") |
| `getTurnoLetraMensal(t)` | Devolve "M" / "T" / "N" / null |
| `restHoursBetween(prev, nextInicio)` | Calcula horas de descanso entre turnos |
| `calcularAlertas()` | Gera lista de alertas do mês (memoizado) |
| `gerarEscalaMensal()` | Algoritmo de geração automática |
| `saveEscala()` | Guarda uma célula (upsert no Supabase) |
| `clearEscala()` | Apaga uma célula |
| `limparMensal()` | Apaga todo o mês (preserva ausências) |
| `reverter()` | Desfaz última geração |
| `exportPDF()` | Gera PDF vectorial landscape A4 |
| `printEscala()` | Abre janela de impressão |

### Estado Local
```typescript
escalas: EscalaRow[]          // entradas do mês
auxiliares: Auxiliar[]        // todos os auxiliares
turnos: Turno[]               // todos os turnos disponíveis
alertas: AlertaMensal[]       // calculado com useMemo
openSec: { ausencia, cobertura, descanso, excesso }  // secções abertas/fechadas
resolvidoBanner: number       // nº de alertas resolvidos (mostra banner 3s)
undoState: UndoState | null   // para reverter
```

---

## EscalaSemanal.tsx
**Rota:** `/escala-semanal`
**Tamanho:** ~76 KB | ~2000 linhas

Vista semanal com postos de trabalho e turnos M/T/N para cada dia.

### Postos de Trabalho (POSTOS)
| Chave | Label | Turnos | Dias |
|-------|-------|--------|------|
| RX_URG | RX URG | M, T, N | todos |
| TAC2 | TAC 2 | M, T, N | todos |
| EXAM1 | Exames Comp. (1) | M, T, N | todos |
| EXAM2 | Exames Comp. (2) | M, T | seg–sáb |
| TRANSPORT | Transportes INT/URG | M, T | todos |
| TAC1 | TAC 1 | M, T | seg–sáb |
| SALA6 | SALA 6 BB | M | todos |
| SALA7 | SALA 7 EXT | M, T | todos |

### Funcionalidades
- Navegar semana a semana
- Atribuir auxiliar a posto + turno + dia
- Atribuir médico a turno + dia
- Distinção de cores por tipo de posto
- Arrastar/clicar para atribuir
- Configurar nº máximo de pessoas por posto

---

## Auxiliares.tsx
**Rota:** `/auxiliares`
**Tamanho:** ~15 KB

CRUD completo de auxiliares.

### Campos
- Nome, Email, Nº Mecanográfico, NIF (Contribuinte)
- Disponível (toggle)
- Trabalha fins-de-semana (toggle)

### Funcionalidades
- Pesquisa em tempo real
- Filtro por disponibilidade
- Modal de edição/criação
- Eliminação com confirmação

---

## Doutores.tsx
**Rota:** `/doutores`
**Tamanho:** ~11 KB

CRUD de médicos + associação a turnos.

### Campos
- Nome, Nº Mecanográfico
- Turnos associados (N:N via `doutor_turnos`)

---

## Turnos.tsx
**Rota:** `/turnos`
**Tamanho:** ~11 KB

CRUD de turnos de trabalho.

### Campos
- Nome/código (ex: M1, T2, N5)
- Horário início / fim
- Cor (paleta de cores)
- Postos associados

### Paleta de Cores Disponível
Amarelo (M), Rosa (T), Azul (N), Ciano (MT), Verde-lima (RX/TAC), Verde (feriado), Vermelho claro, Roxo, Cinza (descanso), Ciano claro, Laranja

---

## Restricoes.tsx
**Rota:** `/restricoes`
**Tamanho:** ~21 KB

Gestão de restrições de auxiliares a turnos/postos/períodos.

### Funcionalidades
- Pesquisa de auxiliar
- Toggle de restrição por turno
- Toggle de restrição por posto
- Período de vigência (data início / fim)
- Motivo da restrição

---

## VincularTurnoPosto.tsx
**Rota:** `/turno-postos`
**Tamanho:** ~6 KB

Tabela N:N: turnos (linhas) × postos (colunas). Checkboxes com auto-save.
Actualiza o array `postos[]` no turno.

---

## Configuracoes.tsx
**Rota:** `/configuracoes`
**Tamanho:** ~26 KB

Configurações do sistema em duas categorias.

### Dados da Empresa (`cfg_empresa` no localStorage)
- Nome da empresa, departamento, telefone, email, logo

### Regras de Horário (`cfg_horarios` no localStorage)
- Bloquear turnos consecutivos
- Horas mínimas de descanso (default: 11)
- Máx. turnos por semana (default: 2 noturnos)
- Máx. turnos por mês (default: 22)
- Máx. turnos noturnos por mês (default: 4)

### Funcionalidades Extra
- Verificação de conexão à base de dados
- Verificação de migrações aplicadas

---

## Login.tsx
**Rota:** `/login`
**Tamanho:** ~21 KB

Login por email/password via Supabase Auth.
Fundo com decorações animadas temáticas (hospital/médico).

---

## Notas Relacionadas

- [[06 - Lógica de Escalas]]
- [[08 - Configurações]]
- [[09 - Erros e Alertas]]

#páginas #rotas #componentes #escala
