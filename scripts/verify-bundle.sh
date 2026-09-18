#!/usr/bin/env bash
#
# Comprueba que ningún secreto (ni su nombre) acaba en el JavaScript que se
# envía al navegador.
#
# Next.js sólo inlinea las variables NEXT_PUBLIC_*, pero un import mal puesto
# puede arrastrar al cliente el esquema que las describe. Esto lo detecta.
#
# Uso:  ./scripts/verify-bundle.sh   (requiere haber hecho `npm run build`)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE="$ROOT/.next/static"

if [ ! -d "$BUNDLE" ]; then
  echo "No hay build. Ejecuta primero: npm run build" >&2
  exit 1
fi

# Nombres de variables secretas y prefijos de claves reales.
#
# STRIPE_PRICE_MONTHLY y STRIPE_PRICE_YEARLY quedan fuera a propósito: los
# price id de Stripe no son secretos (aparecen en la propia URL de pago) y sus
# nombres viven en src/config/pricing.ts, que la tabla de precios importa en
# cliente con toda la razón.
NEEDLES=(
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  AI_API_KEY
  sk_test_
  sk_live_
  whsec_
  sk-ant-
  service_role
)

failed=0

echo "→ Revisando el bundle de cliente…"
for needle in "${NEEDLES[@]}"; do
  if hits=$(grep -rl -- "$needle" "$BUNDLE" 2>/dev/null); then
    echo "  FALLO  «$needle» aparece en:"
    echo "$hits" | sed 's/^/           /'
    failed=1
  else
    echo "  OK     $needle"
  fi
done

echo ""
if [ "$failed" -eq 1 ]; then
  echo "Hay secretos o esquema de servidor en el bundle de cliente."
  echo "Revisa qué componente de cliente importa un módulo de servidor."
  exit 1
fi

echo "  Ningún secreto llega al navegador."
