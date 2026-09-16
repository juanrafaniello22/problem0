# Arquitectura de Planora

Documento vivo. Recoge las decisiones tomadas y por qué, para que las
siguientes fases no tengan que redescubrirlas.

## 1. Principio rector

El núcleo del producto es un único recorrido:

```
Examen → Temas → Disponibilidad → IA → Plan diario → Estudio → Progreso → Replanificación
```

Todo lo demás (hábitos, Focus, estadísticas) existe para reforzar ese
recorrido, no para competir con él. Cuando haya que elegir entre añadir una
función o pulir ese camino, se pule el camino.

## 2. Stack

| Capa            | Elección                        | Motivo |
|-----------------|---------------------------------|--------|
| Framework       | Next.js 16 (App Router)         | Server Components para que la landing sea estática y el panel rápido |
| Lenguaje        | TypeScript en modo estricto     | `noUncheckedIndexedAccess` activado; `any` prohibido por ESLint |
| Estilos         | Tailwind CSS 4 + tokens propios | Sistema de diseño en CSS, sin fichero de configuración JS |
| Componentes     | Primitivos estilo shadcn/ui sobre Radix | Código en el repositorio, sin dependencia de un tema ajeno |
| Datos y auth    | Supabase (Postgres + Auth)      | RLS en base de datos: la autorización vive donde están los datos |
| Validación      | Zod 4                           | El mismo esquema valida formulario, server action y respuesta de la IA |
| Formularios     | Server Actions + `useActionState`; React Hook Form donde hay pasos | Ver §6 |
| Pagos           | Stripe (fase 5)                 | Checkout + Customer Portal + webhooks |
| Tests           | Vitest + Testing Library        | Rápido y sin configuración adicional |

## 3. Estructura de carpetas

```
src/
├── app/                      Rutas (App Router)
│   ├── (marketing)/          Landing, precios y legales · estáticas
│   ├── (auth)/               Login, registro, recuperación de contraseña
│   ├── (app)/                Zona privada con shell propio
│   ├── onboarding/           Activación, con layout minimalista propio
│   ├── auth/callback/        Retorno de Supabase Auth
│   └── api/                  Route handlers (webhooks, IA)
├── components/
│   ├── ui/                   Primitivos sin lógica de negocio
│   ├── brand/                Logo e identidad
│   ├── landing/              Secciones de la landing
│   ├── layout/               Cabeceras, sidebar, navegación
│   ├── auth/ onboarding/ dashboard/ settings/   Por dominio
│   └── shared/               Estados vacíos, cabeceras de página
├── config/                   Constantes centralizadas (§4)
├── lib/                      Utilidades puras y clientes de infraestructura
├── services/                 Acceso a datos y lógica de negocio (§5)
├── hooks/                    Hooks de cliente
├── types/                    Tipos de la base de datos
└── validation/               Esquemas Zod
supabase/migrations/          SQL versionado
tests/                        Unitarios y de componentes
```

Regla que se aplica sin excepciones: **un componente de React nunca habla
directamente con Supabase, Stripe o la IA**. Pasa siempre por `services/`.

## 4. Configuración centralizada

Nada de constantes repartidas por la aplicación:

- `config/pricing.ts` — importes, intervalos y qué variable de entorno tiene
  cada `price_id` de Stripe. Cambiar un precio es cambiar un número aquí.
- `config/limits.ts` — límites por plan (generaciones de IA, exámenes
  activos, hábitos) y ventanas de rate limiting.
- `config/routes.ts` — todas las rutas y qué prefijos son privados. Lo usan
  el proxy, los guardias de servidor y los tests.
- `config/site.ts` — marca, metadatos, `getAppUrl()`. Nunca se asume dominio.
- `config/env.ts` — acceso tipado a variables de entorno; los secretos sólo
  se leen por `serverEnv()`, que lanza si se invoca en el navegador.

## 5. Capa de servicios

```
services/
├── auth/       session.ts (guardias de servidor) · auth.actions.ts
├── profile/    profile.service.ts · onboarding.actions.ts · profile.actions.ts
├── analytics/  events.ts (catálogo cerrado) · track.ts
├── billing/    (fase 5)
└── ai/         (fase 3)
```

- `*.service.ts` — lectura y escritura de datos. Devuelve tipos del dominio o
  lanza `AppError`.
- `*.actions.ts` — server actions. Autentican, validan con Zod, llaman al
  servicio y devuelven `ActionResult`, nunca una excepción hacia el cliente.

## 6. Formularios: dos patrones, cada uno donde encaja

- **Server Actions + `useActionState`** para autenticación y ajustes: el
  formulario funciona con o sin JavaScript y las credenciales no pasan por
  estado de cliente.
- **React Hook Form + `zodResolver`** en el asistente de onboarding, donde hay
  validación por paso y estado intermedio. Aun así, la server action vuelve a
  validar: lo que llega del cliente nunca se da por bueno.

## 7. Seguridad

Cuatro capas, cada una suficiente por sí sola para lo que protege:

1. **RLS en Postgres.** Toda tabla con datos de usuario tiene RLS activo y
   políticas `to authenticated` filtradas por `auth.uid()`. Es la última
   línea y la que de verdad aísla a los usuarios.
2. **Proxy (`src/proxy.ts`).** Refresca la sesión y bloquea rutas privadas.
   Usa `getUser()` (valida el JWT contra Supabase) y nunca `getSession()`,
   porque la cookie es manipulable en cliente.
3. **Guardias de servidor.** Cada página y acción privada llama a
   `requireUser()` / `requireSessionUser()`. El proxy no es la única barrera.
4. **Validación con Zod** en el borde de cada server action y route handler.

Además: secretos sólo en servidor (`server-only` en el cliente admin de
Supabase), rate limiting por IP en autenticación, protección contra open
redirects en `safeNextPath()`, logs con redacción de campos sensibles y
mensajes de error genéricos que no revelan si un email existe.

Hay un test (`tests/unit/database-rls.test.ts`) que lee las migraciones y
falla si alguien añade una tabla sin RLS, una política `to public` o un
`using (true)`.

## 8. Base de datos

Migraciones SQL versionadas en `supabase/migrations/`. La fundación (0001)
crea `profiles`, `user_settings`, `subjects`, `analytics_events` y `feedback`.
Las siguientes fases añadirán `exams`, `topics`, `study_plans`,
`study_plan_versions`, `study_tasks`, `habits`, `habit_completions`,
`study_sessions`, `subscriptions` y `ai_generations`.

Decisiones:

- Un trigger `on_auth_user_created` crea perfil y ajustes al registrarse, de
  forma que nunca existe un usuario sin perfil.
- `analytics_events` y `feedback` referencian el perfil con
  `on delete set null`: al borrar la cuenta el evento se anonimiza en lugar de
  desaparecer.
- `marketing_opt_in` es `false` por defecto: el consentimiento se da, no se
  presume.
- Los tipos TypeScript viven en `src/types/database.ts` y deben reflejar las
  migraciones. Se pueden regenerar con `supabase gen types`.

## 9. IA (preparado, se implementa en fase 3)

- Abstracción `AIProvider` con implementaciones `OpenAIProvider`,
  `AnthropicProvider` y `GeminiProvider`. La aplicación depende de la
  interfaz, no del proveedor.
- La IA devuelve **JSON estructurado**, nunca HTML. La respuesta se valida con
  Zod; si no cumple el esquema no se guarda nada, se registra el error y se
  ofrece reintentar.
- Las API keys se leen sólo en servidor. Cada generación se registra en
  `ai_generations` para controlar coste y aplicar los límites de
  `config/limits.ts`.

## 10. Rendimiento

- La landing y las páginas legales se prerrenderizan como estáticas. Por eso
  el layout público **no** consulta la sesión: hacerlo convertiría la landing
  en dinámica y penalizaría la primera carga desde móvil.
- Server Components por defecto; `'use client'` sólo donde hay interacción.
- Fuentes con `next/font` (sin petición a un tercero en tiempo de ejecución).
- Animaciones en CSS, respetando `prefers-reduced-motion`.

## 11. Estado por fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Fundación, branding, landing, auth, onboarding, panel básico | **Completada** |
| 2 | Exámenes, temas, tareas, panel real, progreso básico | Pendiente |
| 3 | `AIProvider`, generación de planes, límites, replanificación | Pendiente |
| 4 | Hábitos, Pomodoro, sesiones de estudio, estadísticas | Pendiente |
| 5 | Stripe, suscripciones, webhook, portal, paywalls | Pendiente |
| 6 | Responsive fino, SEO, PWA, analítica, feedback, seguridad | Pendiente |
| 7 | Testing completo, revisión y despliegue | Pendiente |

## 12. Decisiones que conviene recordar

- **`proxy.ts` en lugar de `middleware.ts`**: Next.js 16 ha renombrado la
  convención; `middleware.ts` sigue funcionando pero avisa de obsolescencia.
- **Primitivos de UI escritos en el repositorio** en vez de instalar un tema:
  Planora necesita identidad propia y control total del detalle.
- **Sin `tailwind.config.js`**: Tailwind 4 define el tema en CSS
  (`@theme inline`), que es donde ya viven los tokens de color.
- **Secciones aún no construidas** muestran un estado «en construcción»
  explícito en lugar de botones que aparentan funcionar.
