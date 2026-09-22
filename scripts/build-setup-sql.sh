#!/usr/bin/env bash
# Genera supabase/setup.sql juntando todas las migraciones en orden.
#
# Sirve para instalar Planora en un proyecto nuevo de Supabase pegando UN solo
# archivo en el SQL Editor, en vez de cinco. El archivo generado no se edita a
# mano: se vuelve a generar ejecutando este script.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=supabase/setup.sql

{
  echo "-- ==========================================================================="
  echo "-- Planora — instalación completa de la base de datos"
  echo "--"
  echo "-- GENERADO AUTOMÁTICAMENTE por scripts/build-setup-sql.sh. No editar a mano."
  echo "--"
  echo "-- Cómo usarlo:"
  echo "--   1. Entra en tu proyecto de Supabase."
  echo "--   2. Menú lateral -> SQL Editor -> New query."
  echo "--   3. Pega TODO este archivo y pulsa Run."
  echo "--"
  echo "-- Se puede ejecutar más de una vez sin romper nada."
  echo "-- ==========================================================================="
  echo

  for file in supabase/migrations/*.sql; do
    echo "-- ---------------------------------------------------------------------------"
    echo "-- $(basename "$file")"
    echo "-- ---------------------------------------------------------------------------"
    echo
    cat "$file"
    echo
  done
} > "$OUT"

echo "Generado $OUT ($(wc -l < "$OUT") líneas)"
