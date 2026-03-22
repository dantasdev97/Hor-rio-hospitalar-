# Deploy Vercel

## Descrição
O projecto é deployed na Vercel com build automático desabilitado (`sourceless: true`). Deploy é feito via API REST v13.

## URLs
- **Produção:** https://horariochl.vercel.app
- **Projecto:** prj_08AtJWNhrheMNtygxQWQGijcpHXb
- **Team:** team_92i2iBitRoKrnxShhQqPPyQF
- **Repo:** dantasdev97/Hor-rio-hospitalar- (repoId: 1175722424)

## Como Fazer Deploy

### 1. Push para main
```bash
git push origin main
```

### 2. Deploy via API REST v13
```bash
TOKEN="vcp_..."  # obter em vercel.com/account/tokens
SHA=$(git rev-parse HEAD)

curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_92i2iBitRoKrnxShhQqPPyQF" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"horariochl\",
    \"project\": \"prj_08AtJWNhrheMNtygxQWQGijcpHXb\",
    \"gitSource\": {
      \"type\": \"github\",
      \"repoId\": \"1175722424\",
      \"ref\": \"main\",
      \"sha\": \"$SHA\"
    },
    \"target\": \"production\"
  }"
```

### 3. Verificar estado
Aguardar ~30-40s e verificar com `vercel inspect <url>` ou no Dashboard.

## Porque não funciona o CLI/GitHub push
- O projecto tem `sourceless: true` na configuração Vercel
- Isto faz com que deploys automáticos do GitHub push sejam CANCELADOS
- O CLI falha com "Unexpected error" em `--prebuilt`
- A API REST v13 com `gitSource` contorna o bloqueio

## Notas
- Se o token der 403, renovar em vercel.com/account/tokens
- O SHA deve ser o commit mais recente no remote `origin/main`
