#!/bin/bash
# deploy.sh — Para usar na tua máquina local, não no Claude Code
#
# COMO USAR:
#   1. Na tua máquina: git clone / git pull do repositório
#   2. Corre: bash deploy.sh
#
# O Claude Code faz push automático ao branch dev após cada sessão.
# Este script faz o merge dev → main (produção / Vercel).

set -e

DEV_BRANCH="claude/fix-auxdrawer-duplicate-property-Wtf9X"
PROD_BRANCH="main"

# Garante que estamos no branch dev e está actualizado
git fetch origin
git checkout "$DEV_BRANCH"
git pull origin "$DEV_BRANCH"

# Verifica se há commits novos para publicar
COMMITS_AHEAD=$(git rev-list --count origin/"$PROD_BRANCH"..HEAD 2>/dev/null || echo "0")
if [ "$COMMITS_AHEAD" = "0" ]; then
  echo "ℹ️  Nada a fazer — tudo já está em produção."
  exit 0
fi

echo "🚀 Deploy: $DEV_BRANCH → $PROD_BRANCH"
echo "   ($COMMITS_AHEAD commit(s) novos)"

# Muda para main, faz pull e merge
git checkout "$PROD_BRANCH"
git pull origin "$PROD_BRANCH"
git merge "$DEV_BRANCH" --no-edit

# Push para produção → Vercel faz deploy automático
git push origin "$PROD_BRANCH"

echo ""
echo "✅ Produção actualizada! Vercel irá fazer deploy."
echo "   Commit: $(git log --oneline -1)"

# Volta ao dev
git checkout "$DEV_BRANCH"
echo "↩️  Voltou ao branch: $DEV_BRANCH"
