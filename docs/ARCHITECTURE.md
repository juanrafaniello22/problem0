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
├── exams/      exam.service.ts · exam.actions.ts
├── ai/         provider.ts · index.ts (fábrica) · plan-prompt.ts
│              plan-sanitizer.ts · plan-generator.ts · usage.service.ts
│              providers/{anthropic,openai,gemini}.provider.ts
├── planning/   plan.schema.ts · plan-summary.ts · scheduler.ts
│              plan.service.ts · plan.actions.ts
├── tasks/      task.service.ts · task.actions.ts
├── habits/     streak.ts (puro) · habit.service.ts · habit.actions.ts
├── sessions/   session.service.ts · session.actions.ts
├── progress/   progress.ts (puro) · progress.service.ts
├── billing/    access.ts (puro) · entitlements.ts · subscription.service.ts
│              stripe.service.ts · billing.actions.ts
└── analytics/  events.ts (catálogo cerrado) · track.ts
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

Tres redes de seguridad automatizadas:

0. `npm run verify:bundle` revisa el JavaScript compilado y falla si encuentra
   un secreto o el nombre de una variable de servidor. Ya ha pillado un caso
   real: `config/env.ts` mezclaba el esquema público y el de servidor, así que
   el segundo acababa en el bundle de cliente (sólo los nombres, nunca los
   valores). Ahora están separados, y `env.server.ts` lleva `server-only`.

Y dos sobre RLS:

1. `tests/unit/database-rls.test.ts` lee las migraciones y falla si alguien
   añade una tabla sin RLS, una política `to public`, un `using (true)` o un
   `CHECK` con `array_length()` (que en PostgreSQL devuelve NULL con arrays
   vacíos, y un CHECK que da NULL se da por cumplido).
2. `npm run verify:rls` levanta un PostgreSQL real, aplica las migraciones y
   comprueba con dos usuarios que uno no puede leer, modificar ni borrar los
   datos del otro — 24 comprobaciones, incluidas las restricciones de
   integridad y los borrados en cascada. Encontró un fallo real: la
   restricción de días disponibles usaba `array_length` y dejaba pasar
   exámenes sin ningún día marcado.

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

## 9. Generación del plan

El plan es el producto. La pieza clave es que **quien lo genera es
intercambiable**: tanto el planificador local como la IA producen la misma
estructura, definida en `services/planning/plan.schema.ts` y validada con Zod
antes de tocar la base de datos.

```
Examen + temas + disponibilidad
        │
        ├──► IA (fase 3) ──┐
        │                  ├──► GeneratedPlan ──► Zod ──► savePlan()
        └──► Planificador ─┘                       │
             determinista                          └──► si no valida, no se
                                                        guarda nada y se
                                                        ofrece reintentar
```

### Planificador determinista (`scheduler.ts`)

Función pura, sin dependencias. Reparte los temas entre los días realmente
disponibles y garantiza que:

- nunca programa más minutos al día de los que el usuario ha dicho;
- nunca planifica el día del examen ni días no marcados;
- reserva los últimos días para repaso, más cuanto más difícil es el examen;
- no inventa qué temas importan más: con pesos iguales, reparte por igual;
- cuando no cabe todo, recorta a todos por igual antes que sacrificar temas
  enteros, y lo dice claramente en `warnings`;
- es determinista: las mismas entradas dan siempre el mismo plan.

Tiene 26 pruebas propias. Dos fallos reales (una sesión de 5 minutos y un
bloque de 90) los encontraron esas pruebas antes de que llegara a la interfaz.

### Versiones del plan

Cada generación o replanificación crea una fila en `study_plan_versions` y
mueve el puntero `study_plans.current_version_id`. Las versiones anteriores no
se borran nunca: son el histórico auditable. El progreso se calcula siempre
sobre la versión vigente.

### IA

Abstracción `AIProvider` (`services/ai/provider.ts`): recibe un JSON Schema y
devuelve JSON parseado. Anthropic está implementado; OpenAI y Gemini son
huecos con la misma firma. La fábrica (`services/ai/index.ts`) es el único
sitio que sabe qué proveedores existen, y devuelve `null` si no hay clave —
sin clave, Planora sigue funcionando con su planificador.

El generador (`plan-generator.ts`) encadena:

```
plan local (siempre disponible)
    │
    ├─ ¿hay proveedor? ─no─► plan local, motivo: ai_disabled
    │
    └─sí─► prompt ─► IA ─► Zod ─► saneado ─► ¿cubre el temario?
                      │       │        │              │
                   error   no cumple  null           no
                      └───────┴────────┴──────────────┴──► plan local + motivo
```

Cada intento se registra en `ai_generations` con su resultado. Sólo los
intentos con éxito gastan cuota: un fallo del proveedor no se le cobra al
usuario. Dos intentos como máximo, y sólo se reintenta si el error es
temporal (saturación, timeout); un error de credenciales no mejora
reintentando.

**El origen del plan se guarda** en `study_plan_versions.source` y se muestra
siempre en la interfaz. Un plan hecho por el planificador local no se disfraza
de plan de IA.

#### Decisiones de la integración

- **Structured outputs** (`output_config.format`) en lugar de pedir JSON por
  texto: la respuesta ya llega con la forma correcta.
- **Esfuerzo `medium` por defecto**, configurable con `AI_EFFORT`. El alumno
  está esperando en el móvil, el plan se valida y se corrige después, y hay
  respaldo local. Quien priorice calidad sobre latencia sube a `high`.
- **JSON Schema escrito a mano** en vez de convertido desde Zod: sirve igual
  para los tres proveedores, que aceptan JSON Schema con conversores distintos.
  La validación fuerte la hace Zod después.
- **Fallback de rechazo del servidor** activado por defecto
  (`AI_REFUSAL_FALLBACK`): si los clasificadores declinan, Anthropic reintenta
  con otro modelo dentro de la misma llamada. Usa API en beta, así que se
  puede apagar sin perder nada — el respaldo local sigue ahí.

## 9e. Cobro

La regla que lo gobierna todo: **la fuente de verdad del acceso Pro es Stripe,
y llega por webhook**. Ninguna otra vía concede acceso.

```
Usuario paga
    │
    ├─► vuelve a /success ──► lee el estado. No lo escribe.
    │
    └─► webhook ──► firma válida? ──no──► 400, no se toca nada
                         │sí
                    ¿evento nuevo? ──no──► 200, ya estaba aplicado
                         │sí
                    se relee la suscripción en Stripe
                         │
                    se escribe en `subscriptions` (clave de servicio)
```

La propiedad de seguridad está en el esquema, no en el código: la tabla
`subscriptions` tiene política de `select` pero **ninguna de `insert`,
`update` ni `delete`**. Aunque alguien encontrase un fallo en la aplicación, no
podría ascenderse a Pro: Postgres no se lo permite. `npm run verify:rls` lo
comprueba contra una base real.

`stripe_events` no tiene ninguna política: es exclusivamente del webhook.

**Quién tiene Pro** (`services/billing/access.ts`, función pura, 23 pruebas):

- Activa o en prueba: Pro.
- Cancelada: Pro hasta el final del periodo pagado. Cancelar no es que te
  quiten el mes que has pagado.
- Pago fallido: margen hasta el fin del ciclo. Una tarjeta caducada no debería
  dejarte sin plan de estudio a mitad de semana.
- Cualquier otra cosa, o un dato ambiguo: Free. Nunca se regala Pro por una
  fecha corrupta o un estado desconocido.

**Idempotencia.** Stripe reenvía los eventos que no reciben un 200. Cada evento
se registra en `stripe_events` antes de aplicarlo, y toda la sincronización es
un `upsert`: aplicar dos veces el mismo estado no cambia nada.

**Borrar la cuenta cancela primero la suscripción.** Si se borrase el usuario
antes, se perdería su identificador de Stripe y se le seguiría cobrando a
alguien que ya no existe.

## 9d. Hábitos y tiempo real

**Rachas** (`services/habits/streak.ts`, función pura con 25 pruebas). Dos
reglas definen el comportamiento:

1. Sólo cuentan los días en los que el hábito toca. Saltarse un domingo no
   rompe un hábito de lunes a viernes.
2. Hoy tiene margen: hasta que termine el día no cuenta como fallado. Una
   racha no debería romperse a las nueve de la mañana.

Un índice único `(habit_id, completed_on)` impide marcar dos veces el mismo
día, así que la racha no se puede inflar repitiendo la acción.

**Modo Focus** (`components/focus/focus-timer.tsx`). El cronómetro mide sólo
tiempo activo:

- El tiempo sale de marcas de reloj (`Date.now()`), no de contar *ticks*, así
  que sigue siendo correcto aunque el navegador ralentice la pestaña.
- Al pausar se acumula lo transcurrido y se para el contador; al reanudar se
  guarda una marca nueva.
- El servidor no se fía del reloj del navegador: acota el tiempo enviado al
  hueco real entre inicio y fin (`session.actions.ts`). Las pausas sólo pueden
  restar.
- Por debajo de un minuto no se guarda nada: es ruido, no una sesión.

Eso da dos métricas distintas, y la aplicación las enseña por separado:
*tiempo planificado* (lo que dura la sesión en el plan) y *tiempo real* (lo
que midió el Focus). Mezclarlas haría que el progreso mintiera.

## 9c. Inyección de prompts

Los nombres de temas los escribe el usuario y acaban en el prompt. Tres capas,
en orden de importancia inversa:

1. El prompt de sistema no contiene datos de usuario.
2. Los datos van en un bloque delimitado, saneados a una sola línea sin
   caracteres de control, con instrucción explícita de tratarlos como datos.
3. **`plan-sanitizer.ts`**, que es la que de verdad cierra el problema. El plan
   saneado sólo puede contener:
   - fechas de la lista de días disponibles calculada por Planora;
   - ids de temas que pertenecen a ese examen;
   - duraciones dentro del presupuesto diario del usuario;
   - **etiquetas que salen del temario real o de una lista fija** — el texto
     libre del modelo nunca llega a la pantalla.

   Todo lo demás se corrige o se descarta, y si no queda plan aprovechable se
   usa el planificador local.

Es una función pura con 23 pruebas que simulan respuestas hostiles: fechas
inventadas, ids de otro usuario, phishing en el nombre del tema, días que se
pasan del tiempo disponible.

## 9b. Límites Free/Pro

Toda la lógica vive en `services/billing/entitlements.ts`:

```ts
canUseFeature(usage, 'create_exam')  // { allowed, reason, limit, used, message }
```

Ningún componente ni acción compara planes por su cuenta. Los límites salen de
`config/limits.ts` y el plan del usuario de `subscription.service.ts`, que hoy
devuelve `free` para todos y en la fase 5 leerá la tabla `subscriptions`
alimentada por el webhook de Stripe.

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
| 2 | Exámenes, temas, planes, tareas, panel real, progreso | **Completada** |
| 3 | `AIProvider`, generación con IA, límites, `ai_generations` | **Completada** |
| 4 | Hábitos, Pomodoro, sesiones de estudio, estadísticas | **Completada** |
| 5 | Stripe, suscripciones, webhook, portal, paywalls | **Completada** |
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
- **El planificador local se adelanta a la fase 3** para que el producto sea
  utilizable de principio a fin desde ya: crear examen → plan → estudiar →
  completar → replanificar. La IA se suma encima, no sustituye la
  arquitectura. Además queda como respaldo cuando la IA falle o se agote la
  cuota, que es justo lo que pide el requisito de no dejar al usuario sin
  plan por un error del modelo.
- **La landing sigue siendo estática aunque haya cobro.** El botón de Pro en
  `/pricing` lleva a `/upgrade`, una ruta protegida dentro de la app donde sí
  se abre el checkout. Así la página pública no se vuelve dinámica sólo para
  saber si hay sesión.
- **Agotar la cuota no bloquea, pero acabar el periodo pagado sí baja a Free.**
  Son cosas distintas: una es un límite de uso dentro de un plan que sigue
  siendo gratuito; la otra es que se acabó lo que se pagó.
- **Los hábitos se archivan, no se borran, por defecto.** Borrar un hábito se
  lleva por delante su racha y su histórico; archivarlo lo quita de en medio
  sin perder nada. El menú ofrece las dos cosas y el borrado pide confirmación.
- **El tiempo real y el planificado no se suman en una sola cifra.** Son
  medidas distintas: una es una intención y la otra un hecho. Presentarlas
  juntas daría una sensación de progreso que no se corresponde con nada.
- **Reordenar temas con botones y no arrastrando**: funciona con teclado, con
  lector de pantalla y con el dedo en un móvil, que es donde más se va a usar.
- **La IA se añade encima del planificador local, no lo sustituye.** El
  planificador es la garantía de que nadie se queda sin plan: por fallo del
  proveedor, por cuota agotada o por una respuesta que no cumple las reglas.
  Es también lo que permite que el plan gratuito sea generoso sin que la
  factura de IA se dispare.
- **Agotar la cuota de IA no bloquea al usuario.** Se genera el plan con el
  planificador local, se dice con claridad y se ofrece Pro. Bloquear a alguien
  que quiere estudiar para venderle una suscripción es exactamente el tipo de
  patrón que el producto quiere evitar.
- **`user_id` duplicado en `topics` y `study_tasks`** aunque se pudiera
  deducir por el examen: permite políticas RLS sin JOIN en cada consulta. Las
  políticas de inserción comprueban además la propiedad del examen, así que la
  desnormalización no abre ningún hueco.
