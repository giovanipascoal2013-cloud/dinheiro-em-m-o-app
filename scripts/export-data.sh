#!/usr/bin/env bash
# =====================================================================
# Exporta dados do projecto Supabase ACTUAL (Lovable Cloud) para ficheiros
# que depois serão importados no NOVO projecto Supabase.
#
# Uso:
#   1. Pedir à equipa Lovable / ler do .env actual:
#        OLD_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
#   2. export OLD_DB_URL="..."
#   3. bash scripts/export-data.sh
#
# Gera em ./dump/:
#   - public_data.sql   (todos os dados das tabelas public, INSERTs)
#   - auth_users.sql    (utilizadores auth — schema auth)
#   - storage.sql       (buckets e objectos — schema storage)
# =====================================================================
set -euo pipefail

if [ -z "${OLD_DB_URL:-}" ]; then
  echo "ERRO: defina OLD_DB_URL antes de correr este script."
  echo 'Ex: export OLD_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"'
  exit 1
fi

mkdir -p dump

echo "==> A exportar dados do schema public..."
pg_dump "$OLD_DB_URL" \
  --schema=public \
  --data-only \
  --no-owner --no-privileges \
  --column-inserts \
  --disable-triggers \
  > dump/public_data.sql

echo "==> A exportar utilizadores (auth.users + auth.identities)..."
pg_dump "$OLD_DB_URL" \
  --schema=auth \
  --data-only \
  --no-owner --no-privileges \
  --table=auth.users \
  --table=auth.identities \
  --column-inserts \
  --disable-triggers \
  > dump/auth_users.sql

echo "==> A exportar metadados de storage (objectos do bucket atm-photos)..."
pg_dump "$OLD_DB_URL" \
  --schema=storage \
  --data-only \
  --no-owner --no-privileges \
  --table=storage.objects \
  --column-inserts \
  > dump/storage.sql || true

echo "==> Concluído. Ficheiros em ./dump/"
ls -lh dump/