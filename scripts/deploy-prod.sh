#!/usr/bin/env bash
# Deploy da stack de produção na VPS (Postgres + API + pgAdmin).
# Uso na VPS: ./scripts/deploy-prod.sh
# CI: disparado pelo GitHub Actions após push na main.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Erro: arquivo .env não encontrado em $ROOT" >&2
  echo "Copie .env.production.example para .env e preencha os valores." >&2
  exit 1
fi

echo "==> Atualizando código (origin/main)..."
git fetch origin main
git reset --hard origin/main

echo "==> Subindo stack Docker (produção)..."
docker compose --env-file .env -f docker/docker-compose.prod.yml up -d --build

echo "==> Removendo imagens Docker antigas..."
docker image prune -f

echo "==> Deploy concluído."
docker compose --env-file .env -f docker/docker-compose.prod.yml ps
