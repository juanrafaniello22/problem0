#!/usr/bin/env bash
#
# Comprueba que las migraciones se aplican y que RLS aísla de verdad a los
# usuarios, usando un PostgreSQL local y temporal.
#
# Requiere PostgreSQL instalado (initdb, pg_ctl, psql).
# No toca tu proyecto de Supabase ni ningún dato real.
#
# Uso:  ./scripts/verify-rls.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="${PLANORA_PG_DIR:-/tmp/planora-rls-check}"

# PostgreSQL se niega a arrancar como root. En contenedores (donde sí somos
# root) relanzamos el script como un usuario sin privilegios.
if [ "$(id -u)" -eq 0 ]; then
  RUNNER="${PLANORA_PG_USER:-postgres}"
  if ! id "$RUNNER" >/dev/null 2>&1; then
    echo "Ejecuta este script como un usuario normal, no como root." >&2
    exit 1
  fi
  rm -rf "$WORKDIR"
  mkdir -p "$WORKDIR"
  chown "$RUNNER" "$WORKDIR"
  exec su "$RUNNER" -s /bin/bash -c "PLANORA_PG_DIR='$WORKDIR' PLANORA_PG_PORT='${PLANORA_PG_PORT:-55432}' bash '${BASH_SOURCE[0]}'"
fi
PORT="${PLANORA_PG_PORT:-55432}"
DB="planora_rls_check"

PG_BIN="$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)"
export PATH="$PG_BIN:$PATH"

cleanup() {
  pg_ctl -D "$WORKDIR/data" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "→ Arrancando un PostgreSQL temporal…"
rm -rf "$WORKDIR/data"
mkdir -p "$WORKDIR"
initdb -D "$WORKDIR/data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$WORKDIR/data" -l "$WORKDIR/pg.log" -o "-p $PORT -k $WORKDIR" start >/dev/null
sleep 2

PSQL=(psql -h "$WORKDIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -c "create database $DB;" >/dev/null

echo "→ Preparando el entorno de Supabase…"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/supabase-stub.sql" >/dev/null 2>&1

echo "→ Aplicando migraciones…"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$migration")"
  "${PSQL[@]}" -d "$DB" -f "$migration" >/dev/null 2>&1
done

echo "→ Comprobando el aislamiento entre usuarios…"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/rls.sql" 2>&1 | sed -E 's/^psql:[^ ]+ //; s/^NOTICE: *//' | grep -vE '^(BEGIN|COMMIT|ROLLBACK|INSERT|DELETE|UPDATE|SET|RESET|DO|CREATE)'
