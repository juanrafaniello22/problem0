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

### Qué crean las migraciones

`0001_foundation.sql` — la base de la cuenta:

| Tabla | Contenido |
|-------|-----------|
| `profiles` | Perfil 1:1 con `auth.users`: nombre, nivel, objetivo, tiempo diario |
| `user_settings` | Tema, avisos y consentimiento de marketing |
| `subjects` | Asignaturas del usuario |
| `analytics_events` | Eventos de producto, sin datos personales |
| `feedback` | Sugerencias, problemas y valoraciones |

`0004_habits_sessions.sql` — constancia y tiempo real:

| Tabla | Contenido |
|-------|-----------|
| `habits` | Hábitos con frecuencia, días e icono |
| `habit_completions` | Un hábito marcado un día. Como mucho una vez por día |
| `study_sessions` | Tiempo REAL estudiado con Focus, sin contar pausas |

`0002_core.sql` — el núcleo del producto:

| Tabla | Contenido |
|-------|-----------|
| `exams` | Examen: fecha, dificultad, minutos al día y días disponibles |
| `topics` | Temas que entran, en el orden que fija el usuario |
| `study_plans` | Un plan por examen, apuntando a su versión vigente |
| `study_plan_versions` | Histórico auditable: cada replanificación es una versión |
| `study_tasks` | Sesiones concretas: qué estudiar, qué día y cuánto |

Además:

- **RLS activo en todas ellas**, con políticas `to authenticated` filtradas
  por `auth.uid()`. Un usuario no puede leer, modificar ni borrar datos de otro.
- Las tablas que cuelgan de un examen comprueban además, al insertar, que ese
  examen es tuyo: no basta con poner tu `user_id` en la fila.
- Un trigger crea perfil y ajustes automáticamente al registrarse, de modo que
  nunca hay un usuario sin perfil.
- Al borrar un examen desaparecen en cascada sus temas, su plan y sus tareas.
  Al borrar la cuenta, los eventos de uso se anonimizan en lugar de perderse.
- Las siguientes fases añadirán `subscriptions`.

> Después de cambiar el esquema, actualiza `src/types/database.ts`
> (o regenéralo con `supabase gen types typescript --project-id <id>`).

## 6. Stripe

Los importes que ve el usuario salen de `src/config/pricing.ts`. Stripe sólo
necesita saber cuánto cobrar.

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

### Qué crea la migración `0005_subscriptions.sql`

| Tabla | Contenido |
|-------|-----------|
| `subscriptions` | Estado de la suscripción de cada usuario |
| `stripe_events` | Eventos ya procesados, para no aplicarlos dos veces |

**La propiedad de seguridad clave:** `subscriptions` tiene política de lectura
pero **ninguna de escritura**. Un usuario puede ver su suscripción y nada más.
Sólo el webhook, que usa la clave de servicio, puede escribirla. `npm run
verify:rls` comprueba contra PostgreSQL real que nadie puede ascenderse a Pro
por su cuenta.

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

Ese comando imprime un `whsec_...` de pruebas: ése es tu
`STRIPE_WEBHOOK_SECRET` en local.

### Cómo se concede el acceso Pro

```
Usuario paga en Stripe
        │
        ├─► vuelve a /success ──► esta página NO da acceso; espera y muestra
        │                          lo que haya confirmado el webhook
        │
        └─► Stripe llama al webhook ──► se valida la firma
                                   └─► se comprueba que el evento es nuevo
                                   └─► se relee la suscripción en Stripe
                                   └─► se escribe en `subscriptions`
                                            │
                                            └─► ahora sí: el usuario es Pro
```

Reglas:

- La firma se valida **siempre**, con el cuerpo crudo. Sin firma válida: 400 y
  no se toca nada.
- Cada evento se procesa una vez (`stripe_events`). Stripe reenvía si no
  recibe un 200, y repetir un evento no debe cambiar el resultado.
- Los eventos que no manejamos devuelven 200 para que Stripe deje de
  mandarlos; un error nuestro devuelve 500 para que reintente.
- El estado se relee de Stripe en lugar de fiarse del contenido del evento.

### Qué pasa al cancelar

Mantienes Pro **hasta el final del periodo que ya has pagado**. Después vuelves
a Free y tus datos se conservan. Si un pago falla, hay margen hasta el fin del
ciclo: una tarjeta caducada no debería dejarte sin plan de estudio a mitad de
semana. La lógica está en `src/services/billing/access.ts`, es una función
pura y tiene 23 pruebas.

## 8. IA

La aplicación no depende de un proveedor concreto: habla con la interfaz
`AIProvider` y elige la implementación según `AI_PROVIDER`.

```
AI_PROVIDER=anthropic     # anthropic | openai | gemini
AI_API_KEY=sk-ant-xxx
AI_MODEL=claude-opus-5
AI_EFFORT=medium          # low | medium | high
AI_REFUSAL_FALLBACK=true
```

Hoy está implementado **Anthropic (Claude)**. OpenAI y Gemini son huecos
preparados: implementar su `generateJson` es lo único que hay que tocar.

**Planora funciona sin IA.** Si no configuras `AI_API_KEY`, los planes los
genera su propio planificador. La IA los mejora; no es un requisito para que
la aplicación sirva.

### Cómo se genera un plan

```
Examen + temas + disponibilidad
        │
        ├─► IA  ──► JSON estructurado ──► Zod ──► saneado ──► ¿cubre el temario?
        │                                   │         │              │
        │                                   ✗         ✗              ✗
        └─► Planificador de Planora ◄───────┴─────────┴──────────────┘
```

Reglas que no se negocian:

- Las API keys viven **sólo en servidor**. Nunca llegan al navegador, y ni la
  clave ni tu identificador de usuario entran en el prompt.
- La IA devuelve **JSON estructurado** (`output_config.format`), nunca HTML.
- La respuesta se valida con Zod **y** se contrasta con las fechas y los temas
  reales. Si la IA se inventa un tema, propone un día que no has marcado o se
  pasa de tu tiempo diario, eso se corrige o se descarta.
- Si nada de eso se puede salvar, el plan lo hace el planificador local y la
  aplicación **te dice quién lo ha hecho**.
- Cada llamada se registra en `ai_generations` (sólo metadatos: nunca el
  prompt ni la respuesta) para controlar el coste.
- Los límites por plan están en `src/config/limits.ts`: 3 generaciones al mes
  en Free. Agotarlas no te bloquea — sigues creando y reorganizando planes con
  el planificador local.
- Rate limiting por usuario en `src/config/limits.ts` (`rateLimits.aiGeneration`).

### Protección contra inyección de prompts

Los nombres de temas los escribe el usuario, así que van al modelo. Tres capas:

1. El prompt de sistema sólo lleva instrucciones nuestras.
2. Los datos del usuario van en un bloque delimitado, en una sola línea y sin
   caracteres de control, etiquetados como datos.
3. **La capa que de verdad cuenta:** el saneado
   (`src/services/ai/plan-sanitizer.ts`). Aunque el modelo obedeciera una orden
   colada en un nombre de tema, sólo podría devolver fechas de tu lista, temas
   de tu examen y duraciones dentro de tu presupuesto. El texto que se muestra
   en pantalla sale siempre de tu temario o de una lista fija de etiquetas,
   nunca del modelo.

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
npm run verify:rls    # comprueba RLS contra un PostgreSQL real (ver abajo)
npm run verify:bundle # comprueba que ningún secreto llega al navegador
```

### Comprobación del bundle

`npm run verify:bundle` (después de `npm run build`) revisa el JavaScript que
se envía al navegador y falla si encuentra una clave secreta o siquiera el
nombre de una variable de servidor. Next.js sólo inlinea las `NEXT_PUBLIC_*`,
pero un import mal puesto puede arrastrar al cliente un módulo de servidor;
esto lo detecta.

### Comprobación de RLS contra PostgreSQL real

`npm run verify:rls` levanta un PostgreSQL temporal, aplica todas las
migraciones y comprueba con dos usuarios de prueba que uno no puede leer,
modificar ni borrar los datos del otro, que las restricciones de integridad
hacen su trabajo y que los borrados en cascada funcionan. Al terminar, borra
todo lo que ha creado.

Requiere PostgreSQL instalado en local (`initdb`, `pg_ctl`, `psql`). No toca
tu proyecto de Supabase ni ningún dato real.

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
  falla si una tabla no tiene RLS, si hay una política `to public`, un
  `using (true)` o un `CHECK` con `array_length()` (que deja pasar los
  arrays vacíos).
- **Planificador** (`tests/unit/scheduler.test.ts`) — 26 comprobaciones: que
  nunca programa más minutos de los disponibles, que respeta los días
  marcados, que no planifica el día del examen, que reserva repaso, que
  avisa cuando no cabe el temario y que es determinista.
- **Saneado de la IA** (`tests/unit/plan-sanitizer.test.ts`) — 23
  comprobaciones con respuestas hostiles o defectuosas: fechas inventadas,
  temas de otro examen, texto de phishing en los nombres, días que se pasan
  del tiempo disponible.
- **Generación completa** (`tests/unit/plan-generator.test.ts`) — la cadena
  IA → validación → saneado → respaldo, con un proveedor simulado. Incluye la
  comprobación que más importa: pase lo que pase, el estudiante acaba con un
  plan utilizable.
- **Progreso** (`tests/unit/progress.test.ts`) — porcentajes, retrasos y
  progreso por tema.
- **Límites Free/Pro** (`tests/unit/entitlements.test.ts`) — qué puede hacer
  cada plan y cuántos usos quedan.
- **Exámenes** (`tests/unit/exam-validation.test.ts`) — validación del
  formulario y de la fecha del examen.
- **Componentes** (`tests/components/`) — la tabla de precios muestra lo que
  dice la configuración; el editor de temas añade, edita, reordena y elimina.

Ya no queda ninguna pieza crítica sin probar.

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
| 2 | Exámenes, asignaturas, temas, tareas, panel real, progreso básico | ✅ Completada |
| 3 | `AIProvider`, generación de planes con IA, límites y consumo | ✅ Completada |
| 4 | Hábitos, Pomodoro, sesiones de estudio, estadísticas | ✅ Completada |
| 5 | Stripe, suscripciones, webhook, portal, Free/Pro, paywalls | ✅ Completada |
| 6 | Responsive fino, SEO, PWA, analítica, feedback, seguridad | ⏳ |
| 7 | Testing completo, revisión y despliegue | ⏳ |

Todas las secciones de la aplicación funcionan con datos reales. No hay
botones que aparenten funcionar sin backend detrás.

**Sobre el tiempo estudiado:** Planora distingue dos cosas que otras apps
mezclan. El *tiempo planificado* es lo que dura una sesión en tu plan. El
*tiempo real* es lo que mide el modo Focus, y **las pausas no cuentan**. En
Progreso verás los dos por separado, porque no son lo mismo.

**Nota sobre la IA:** Planora genera los planes con IA cuando hay una clave
configurada, y con su propio planificador cuando no la hay, cuando la IA falla
o cuando se agota la cuota del mes. Ambos producen el mismo formato de plan
(`src/services/planning/plan.schema.ts`), así que son intercambiables. La
aplicación siempre indica en pantalla quién ha hecho cada plan.

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
- [x] Aislamiento entre usuarios verificado contra PostgreSQL real (`npm run verify:rls`)
- [x] Límites Free/Pro centralizados en `canUseFeature`, aplicados en servidor
- [x] Rate limiting en la generación con IA, por usuario
- [x] Prompts endurecidos contra inyección, con saneado de la respuesta
- [x] La IA nunca recibe claves ni identificadores de usuario
- [x] `ai_generations` no guarda prompts ni respuestas, sólo metadatos
- [x] Webhook de Stripe validado por firma, con el cuerpo crudo
- [x] `subscriptions` sin políticas de escritura: nadie se regala Pro
- [x] Eventos de Stripe procesados una sola vez
- [x] Borrar la cuenta cancela la suscripción antes de borrar nada
- [ ] Rate limiting distribuido (hoy es por instancia) — antes de escalar

## Aviso legal

Los textos de `/privacy`, `/terms` y `/cookies` son un **borrador de base**,
marcado como tal en la propia página. Debe revisarlos un profesional antes del
lanzamiento y adaptarlos a la entidad que explote el servicio.

La landing no afirma número de usuarios, resultados ni premios, y los
testimonios son huecos claramente marcados para sustituir por opiniones reales
con consentimiento.
