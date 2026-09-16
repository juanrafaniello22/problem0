<div align="center">

# Planora

**Tu plan de estudio. Creado por IA.**

Dile a Planora qué tienes que estudiar y cuándo tienes el examen.
La IA convierte todo en un plan diario que puedes seguir.

</div>

---

Planora no es otra aplicación de tareas. El producto es un único recorrido,
bien hecho:

```
Examen → Temas → Disponibilidad → IA → Plan diario → Estudio → Progreso → Replanificación
```

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Supabase](#4-supabase)
5. [Base de datos](#5-base-de-datos)
6. [Stripe](#6-stripe)
7. [Webhooks](#7-webhooks)
8. [IA](#8-ia)
9. [Desarrollo local](#9-desarrollo-local)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Vercel](#12-vercel)
13. [Dominio personalizado](#13-dominio-personalizado)
14. [Estado del proyecto](#14-estado-del-proyecto)
15. [Checklist de seguridad](#15-checklist-de-seguridad)

---

## 1. Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js     | 20.9 o superior (recomendado 22 LTS) |
| npm         | 10 o superior |
| Cuenta de Supabase | Gratuita sirve para empezar |
| Cuenta de Stripe | Modo test para desarrollo (fase 5) |
| Clave de un proveedor de IA | OpenAI, Anthropic o Gemini (fase 3) |

Opcional pero recomendado: la [CLI de Supabase](https://supabase.com/docs/guides/cli)
para aplicar migraciones desde la terminal.

## 2. Instalación

```bash
git clone https://github.com/juanrafaniello22/problem0.git planora
cd planora
npm install
cp .env.example .env.local
```

Rellena `.env.local` con tus credenciales (apartado siguiente) y arranca:

```bash
npm run dev
```

La aplicación queda en <http://localhost:3000>.

## 3. Variables de entorno

Todas las variables están documentadas en `.env.example`. **Nunca** subas
`.env.local` al repositorio ni pongas secretos reales en `.env.example`.

| Variable | Dónde se usa | Pública |
|----------|--------------|---------|
| `NEXT_PUBLIC_APP_URL` | URLs absolutas: metadatos, callbacks de auth, Stripe | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente de Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase (protegido por RLS) | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones administrativas de servidor. **Salta RLS** | No |
| `STRIPE_SECRET_KEY` | Checkout, portal y API de Stripe | No |
| `STRIPE_WEBHOOK_SECRET` | Verificación de firma del webhook | No |
| `STRIPE_PRICE_MONTHLY` | `price_id` del plan mensual | No |
| `STRIPE_PRICE_YEARLY` | `price_id` del plan anual | No |
| `AI_PROVIDER` | `openai`, `anthropic` o `gemini` | No |
| `AI_API_KEY` | Clave del proveedor de IA | No |
| `AI_MODEL` | Identificador del modelo | No |

> Sólo las variables con prefijo `NEXT_PUBLIC_` llegan al navegador.
> Las demás se leen a través de `serverEnv()`, que lanza un error si alguien
> intenta usarlas en cliente.

## 4. Supabase

1. Crea un proyecto en <https://supabase.com/dashboard>.
2. Ve a **Project Settings → API** y copia:
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *anon public* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *service_role* → `SUPABASE_SERVICE_ROLE_KEY` (secreta)
3. En **Authentication → Providers**, deja activado *Email*.
4. En **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` en desarrollo, tu dominio en producción.
   - *Redirect URLs*: añade `http://localhost:3000/auth/callback` y
     `https://TU-DOMINIO/auth/callback`.
5. En **Authentication → Email**, decide si exiges confirmación de email.
   La aplicación soporta ambas configuraciones: si la exiges, el registro
   muestra la pantalla «Revisa tu correo»; si no, entra directo al onboarding.

## 5. Base de datos

Las migraciones están en `supabase/migrations/`, numeradas y en orden.

**Con la CLI de Supabase** (recomendado):

```bash
supabase link --project-ref TU-PROJECT-REF
supabase db push
```

**Desde el panel web**: abre el *SQL Editor* y ejecuta cada archivo de
`supabase/migrations/` en orden ascendente.

### Qué crea `0001_foundation.sql`

| Tabla | Contenido |
|-------|-----------|
| `profiles` | Perfil 1:1 con `auth.users`: nombre, nivel, objetivo, tiempo diario |
| `user_settings` | Tema, avisos y consentimiento de marketing |
| `subjects` | Asignaturas del usuario |
| `analytics_events` | Eventos de producto, sin datos personales |
| `feedback` | Sugerencias, problemas y valoraciones |

Además:

- **RLS activo en todas ellas**, con políticas `to authenticated` filtradas
  por `auth.uid()`. Un usuario no puede leer, modificar ni borrar datos de otro.
- Un trigger crea perfil y ajustes automáticamente al registrarse, de modo que
  nunca hay un usuario sin perfil.
- Las siguientes fases añadirán `exams`, `topics`, `study_plans`,
  `study_plan_versions`, `study_tasks`, `habits`, `habit_completions`,
  `study_sessions`, `subscriptions` y `ai_generations`.

> Después de cambiar el esquema, actualiza `src/types/database.ts`
> (o regenéralo con `supabase gen types typescript --project-id <id>`).

## 6. Stripe

*Se integra en la fase 5. La configuración de precios ya está preparada en
`src/config/pricing.ts`.*

1. Crea una cuenta en <https://dashboard.stripe.com> y trabaja en **modo test**.
2. **Productos → Añadir producto**: crea *Planora Pro*.
3. Añádele dos precios recurrentes:
   - Mensual: 7,99 € / mes → copia el `price_id` a `STRIPE_PRICE_MONTHLY`
   - Anual: 49,99 € / año → copia el `price_id` a `STRIPE_PRICE_YEARLY`
4. **Developers → API keys**: copia la *Secret key* a `STRIPE_SECRET_KEY`.
5. **Settings → Billing → Customer portal**: activa el portal y permite
   cancelar la suscripción y actualizar el método de pago.

Los importes que se muestran en la interfaz salen de
`src/config/pricing.ts`. Si cambias un precio en Stripe, cámbialo también ahí:
es el único sitio del código donde vive.

## 7. Webhooks

El estado de la suscripción se sincroniza **sólo** por webhook. Visitar
`/success` nunca activa Pro: la fuente de verdad está en el backend.

Endpoint: `POST /api/stripe/webhook`

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://TU-DOMINIO/api/stripe/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copia el *Signing secret* a `STRIPE_WEBHOOK_SECRET`.

En local, con la CLI de Stripe:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

La firma se valida siempre antes de procesar nada.

## 8. IA

*Se integra en la fase 3.*

La aplicación no depende de un proveedor concreto: habla con una interfaz
`AIProvider` y elige la implementación según `AI_PROVIDER`.

```
AI_PROVIDER=anthropic     # openai | anthropic | gemini
AI_API_KEY=...
AI_MODEL=claude-sonnet-5
```

Reglas que no se negocian:

- Las API keys viven **sólo en servidor**. Nunca llegan al navegador.
- La IA devuelve **JSON estructurado**, nunca HTML. Se valida con Zod.
- Si la respuesta no cumple el esquema no se guarda el plan: se registra el
  error y se ofrece reintentar con un mensaje comprensible.
- Cada generación se registra en `ai_generations` para controlar coste.
- Los límites por plan están en `src/config/limits.ts`:
  3 generaciones al mes en Free.

## 9. Desarrollo local

```bash
npm run dev         # servidor de desarrollo
npm run build       # build de producción
npm run start       # sirve el build
npm run lint        # ESLint
npm run typecheck   # TypeScript sin emitir
npm run test        # Vitest
npm run check       # lint + typecheck + test + build
```

Antes de cerrar cualquier fase se ejecuta `npm run check` y se corrigen los
errores antes de seguir.

## 10. Testing

Vitest con jsdom y Testing Library.

```bash
npm run test          # una pasada
npm run test:watch    # modo vigilancia
```

Qué se cubre hoy:

- **Validación** (`tests/unit/auth-validation.test.ts`, `onboarding-validation.test.ts`)
  — reglas de contraseña, normalización de email, límites del onboarding.
- **Fechas** (`tests/unit/date.test.ts`) — cuentas atrás, cambios de mes, año
  bisiesto y cambio de hora; formateo de minutos y saludo por zona horaria.
- **Seguridad** (`tests/unit/security.test.ts`) — protección contra open
  redirects, clasificación de rutas privadas y rate limiting.
- **Precios y límites** (`tests/unit/pricing.test.ts`) — coherencia entre
  planes y que Pro nunca sea más restrictivo que Free.
- **RLS** (`tests/unit/database-rls.test.ts`) — analiza las migraciones y
  falla si una tabla no tiene RLS, si hay una política `to public` o un
  `using (true)`.
- **Componentes** (`tests/components/pricing-plans.test.tsx`) — la tabla de
  precios muestra lo que dice la configuración.

Pendiente para fases siguientes: generación de planes con IA, cálculo de
progreso, replanificación y webhook de Stripe.

## 11. Deployment

Ruta objetivo: **GitHub → Vercel → Supabase → Stripe → proveedor de IA**.

1. Crea el proyecto de Supabase (apartado 4).
2. Configura sus variables de entorno.
3. Ejecuta las migraciones (apartado 5).
4. Configura Stripe (apartado 6).
5. Crea el producto *Planora Pro*.
6. Crea los precios mensual y anual.
7. Configura el webhook (apartado 7).
8. Configura el proveedor de IA (apartado 8).
9. Conecta el repositorio de GitHub a Vercel.
10. Despliega.
11. Configura el dominio (apartado 13).
12. Prueba en producción: registro, creación de examen, generación de plan,
    checkout, cancelación y vuelta a Free.

## 12. Vercel

1. <https://vercel.com/new> → importa el repositorio.
2. Framework: **Next.js** (se detecta solo). No hace falta tocar los comandos.
3. En **Settings → Environment Variables** añade todas las del apartado 3
   para *Production*, *Preview* y *Development*.
4. `NEXT_PUBLIC_APP_URL` debe apuntar a la URL real de cada entorno.
5. Despliega.

Después del primer despliegue, vuelve a Supabase y añade la URL de Vercel a
*Site URL* y a *Redirect URLs*, y a Stripe para el endpoint del webhook.

## 13. Dominio personalizado

1. En Vercel: **Settings → Domains → Add** y sigue las instrucciones de DNS.
2. Actualiza `NEXT_PUBLIC_APP_URL` con el dominio final.
3. Actualiza en Supabase *Site URL* y *Redirect URLs*.
4. Actualiza la URL del webhook en Stripe.
5. Comprueba que `/robots.txt`, `/sitemap.xml` y la imagen de Open Graph
   apuntan al dominio nuevo.

El código nunca asume un dominio: todo pasa por `getAppUrl()`
(`src/config/site.ts`), que usa `NEXT_PUBLIC_APP_URL` y cae a la URL de Vercel
o a `localhost` si no está definida.

## 14. Estado del proyecto

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Fundación, branding, landing, autenticación, onboarding, panel básico | ✅ Completada |
| 2 | Exámenes, asignaturas, temas, tareas, panel real, progreso básico | ⏳ |
| 3 | `AIProvider`, generación de planes, límites de IA, replanificación | ⏳ |
| 4 | Hábitos, Pomodoro, sesiones de estudio, estadísticas | ⏳ |
| 5 | Stripe, suscripciones, webhook, portal, Free/Pro, paywalls | ⏳ |
| 6 | Responsive fino, SEO, PWA, analítica, feedback, seguridad | ⏳ |
| 7 | Testing completo, revisión y despliegue | ⏳ |

Las secciones todavía no construidas (Plan, Focus, Hábitos, Progreso) muestran
un estado «en construcción» explícito. No hay botones que aparenten funcionar
sin backend detrás.

La arquitectura y las decisiones de diseño están documentadas en
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 15. Checklist de seguridad

Estado actual de la fase 1:

- [x] Ninguna API key en el frontend (`server-only` en el cliente admin)
- [x] RLS activo en todas las tablas con datos de usuario
- [x] Usuarios aislados: políticas `to authenticated` filtradas por `auth.uid()`
- [x] Rutas privadas protegidas en proxy **y** en servidor
- [x] Todas las entradas validadas con Zod en servidor
- [x] Rate limiting en autenticación y recuperación de contraseña
- [x] No se confía en datos del cliente (validación duplicada)
- [x] Protección contra open redirects (`safeNextPath`)
- [x] `.env` fuera del repositorio, `.env.example` sin secretos
- [x] Errores internos no visibles: mensajes genéricos y sin stack traces
- [x] Logs con redacción de campos sensibles
- [x] Cabeceras de seguridad (`nosniff`, `Referrer-Policy`, `X-Frame-Options`)
- [ ] Webhook de Stripe validado por firma — *fase 5*
- [ ] Rate limiting en los endpoints de IA — *fase 3*
- [ ] Rate limiting distribuido (hoy es por instancia) — antes de escalar

## Aviso legal

Los textos de `/privacy`, `/terms` y `/cookies` son un **borrador de base**,
marcado como tal en la propia página. Debe revisarlos un profesional antes del
lanzamiento y adaptarlos a la entidad que explote el servicio.

La landing no afirma número de usuarios, resultados ni premios, y los
testimonios son huecos claramente marcados para sustituir por opiniones reales
con consentimiento.
