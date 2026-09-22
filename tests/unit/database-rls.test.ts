import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Comprobaciones estáticas sobre las migraciones.
 *
 * No sustituyen a probar RLS contra una base real, pero sí evitan el fallo
 * más caro: añadir una tabla con datos de usuario y olvidar activar RLS o
 * escribir una política que deje los datos al alcance de cualquiera.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function readMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  return files.map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8')).join('\n');
}

const sql = readMigrations();

function tableNames(): string[] {
  const matches = sql.matchAll(/create table if not exists public\.(\w+)/g);
  return [...new Set([...matches].map((match) => match[1]).filter((name): name is string => Boolean(name)))];
}

describe('migraciones de Supabase', () => {
  it('hay al menos una migración', () => {
    expect(readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql')).length).toBeGreaterThan(0);
  });

  it('crea todas las tablas esperadas', () => {
    expect(tableNames().sort()).toEqual(
      [
        'ai_generations',
        'analytics_events',
        'exams',
        'feedback',
        'habit_completions',
        'habits',
        'profiles',
        'study_plan_versions',
        'study_plans',
        'stripe_events',
        'study_sessions',
        'study_tasks',
        'subjects',
        'subscriptions',
        'topics',
        'user_settings',
      ].sort(),
    );
  });

  it('las tablas que cuelgan de un examen comprueban su propiedad al insertar', () => {
    for (const table of ['topics', 'study_plans']) {
      const policy = sql.match(
        new RegExp(`create policy "${table}_insert_own"[\\s\\S]*?;`),
      )?.[0];
      expect(policy, `falta la política de insert de ${table}`).toBeTruthy();
      expect(policy).toContain('from public.exams');
    }

    const tasksPolicy = sql.match(/create policy "study_tasks_insert_own"[\s\S]*?;/)?.[0];
    expect(tasksPolicy).toContain('from public.study_plan_versions');
  });

  it('el histórico de versiones del plan es inmutable', () => {
    expect(sql).not.toMatch(/create policy "study_plan_versions_(update|delete)/);
  });

  it('el registro de consumo de IA es inmutable', () => {
    // Si el usuario pudiera borrar sus generaciones, los límites del plan
    // gratuito no valdrían nada.
    expect(sql).not.toMatch(/create policy "ai_generations_(update|delete)/);
  });

  it('un hábito sólo se puede marcar una vez al día', () => {
    // Sin este índice la racha se inflaría marcando el mismo día varias veces.
    expect(sql).toMatch(
      /create unique index if not exists habit_completions_unique[\s\S]*?\(habit_id, completed_on\)/,
    );
  });

  it('las sesiones de estudio no se pueden editar una vez guardadas', () => {
    // Se pueden borrar (por un cronómetro olvidado), pero no maquillar.
    expect(sql).not.toMatch(/create policy "study_sessions_update/);
  });

  it('las marcas de hábito comprueban que el hábito es tuyo al insertar', () => {
    const policy = sql.match(/create policy "habit_completions_insert_own"[\s\S]*?;/)?.[0];
    expect(policy).toBeTruthy();
    expect(policy).toContain('from public.habits');
  });

  it('nadie puede escribir su propia suscripción', () => {
    // Si el usuario pudiera insertar o actualizar aquí, se regalaría Pro.
    // Sólo el webhook de Stripe, con la clave de servicio, escribe esta tabla.
    expect(sql).not.toMatch(/create policy "subscriptions_(insert|update|delete)/);
    expect(sql).toMatch(/create policy "subscriptions_select_own"/);
  });

  it('la tabla de eventos de Stripe no es accesible para los usuarios', () => {
    // Con RLS activo y sin ninguna política, nadie autenticado la ve.
    expect(sql).toContain('alter table public.stripe_events enable row level security');
    expect(sql).not.toMatch(/create policy "stripe_events/);
  });

  it('el consumo de IA no guarda prompts ni respuestas', () => {
    const table = sql.match(/create table if not exists public\.ai_generations[\s\S]*?\n\);/)?.[0];
    expect(table).toBeTruthy();
    for (const forbidden of ['prompt', 'response', 'content', 'completion']) {
      expect(table, `la tabla guarda "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('una tarea completada siempre guarda cuándo se completó', () => {
    expect(sql).toContain('study_tasks_completed_consistency');
  });

  it('no usa array_length() dentro de un CHECK', () => {
    // array_length() devuelve NULL con arrays vacíos y un CHECK que da NULL
    // se da por cumplido, así que dejaría pasar la lista vacía.
    // Para comprobar el tamaño de un array va cardinality().
    const checks = [...sql.matchAll(/check\s*\(([\s\S]*?)\)\s*(,|\n)/g)].map(
      (match) => match[1] ?? '',
    );
    for (const check of checks) {
      expect(check, 'usa array_length() en un CHECK; usa cardinality()').not.toContain(
        'array_length(',
      );
    }
  });

  it('activa RLS en todas las tablas creadas', () => {
    for (const table of tableNames()) {
      expect(
        sql.includes(`alter table public.${table} enable row level security`),
        `Falta "enable row level security" en public.${table}`,
      ).toBe(true);
    }
  });

  it('cada tabla tiene al menos una política de lectura ligada a auth.uid()', () => {
    // stripe_events es la excepción a propósito: sin políticas, sólo la clave
    // de servicio la toca. Se comprueba aparte.
    const usuariosNoLaVen = new Set(['stripe_events']);

    for (const table of tableNames()) {
      if (usuariosNoLaVen.has(table)) continue;
      const policyBlocks = [
        ...sql.matchAll(new RegExp(`create policy "[^"]+" on public\\.${table}[\\s\\S]*?;`, 'g')),
      ].map((match) => match[0]);

      expect(policyBlocks.length, `public.${table} no tiene políticas`).toBeGreaterThan(0);

      const selectPolicies = policyBlocks.filter((block) => block.includes('for select'));
      expect(selectPolicies.length, `public.${table} no tiene política de select`).toBeGreaterThan(0);

      for (const block of selectPolicies) {
        expect(block, `La política de select de public.${table} no filtra por auth.uid()`).toContain(
          'auth.uid()',
        );
      }
    }
  });

  it('ninguna política se concede al rol público ni con "using (true)"', () => {
    const policyBlocks = [...sql.matchAll(/create policy "[^"]+" on public\.\w+[\s\S]*?;/g)].map(
      (match) => match[0],
    );

    for (const block of policyBlocks) {
      expect(block, 'Hay una política concedida al rol público').not.toMatch(/\bto public\b/);
      expect(block, 'Hay una política con "using (true)"').not.toMatch(/using\s*\(\s*true\s*\)/);
    }
  });

  it('todas las políticas se conceden al rol authenticated', () => {
    const policyBlocks = [...sql.matchAll(/create policy "[^"]+" on public\.\w+[\s\S]*?;/g)].map(
      (match) => match[0],
    );

    for (const block of policyBlocks) {
      expect(block).toMatch(/\bto authenticated\b/);
    }
  });

  it('las tablas con datos de usuario referencian profiles o auth.users', () => {
    // `profiles` es la raíz, y `stripe_events` no guarda datos de nadie: sólo
    // qué eventos de Stripe ya se procesaron, para no repetirlos.
    const sinDuenyo = new Set(['profiles', 'stripe_events']);

    for (const table of tableNames()) {
      if (sinDuenyo.has(table)) continue;
      const tableBlock = sql.match(
        new RegExp(`create table if not exists public\\.${table}[\\s\\S]*?\\n\\);`),
      )?.[0];
      expect(tableBlock, `No se encontró la definición de public.${table}`).toBeTruthy();
      expect(tableBlock).toMatch(/references public\.profiles \(id\)|references auth\.users \(id\)/);
    }
  });

  it('las funciones SECURITY DEFINER fijan el search_path', () => {
    const definers = [...sql.matchAll(/create or replace function[\s\S]*?\$\$;/g)]
      .map((match) => match[0])
      .filter((block) => block.includes('security definer'));

    expect(definers.length).toBeGreaterThan(0);
    for (const block of definers) {
      expect(block, 'Una función SECURITY DEFINER no fija search_path').toContain(
        'set search_path',
      );
    }
  });

  it('el alta de usuarios crea perfil y ajustes automáticamente', () => {
    expect(sql).toContain('on_auth_user_created');
    expect(sql).toMatch(/insert into public\.profiles/);
    expect(sql).toMatch(/insert into public\.user_settings/);
  });

  it('el consentimiento de marketing está desactivado por defecto (RGPD)', () => {
    expect(sql).toMatch(/marketing_opt_in boolean not null default false/);
  });
});

describe('setup.sql', () => {
  const setup = readFileSync(join(process.cwd(), 'supabase', 'setup.sql'), 'utf8');

  it('contiene todas las migraciones, en orden', () => {
    // Es el archivo que se pega en Supabase para instalar de una vez. Si se
    // queda atrás respecto a las migraciones, alguien monta media base de
    // datos y no se entera hasta que algo falla en producción.
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let cursor = 0;
    for (const file of files) {
      const body = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const position = setup.indexOf(body, cursor);
      expect(position, `${file} falta o está desordenado en setup.sql`).toBeGreaterThan(-1);
      cursor = position + body.length;
    }
  });

  it('avisa de que se genera solo', () => {
    expect(setup).toContain('GENERADO AUTOMÁTICAMENTE');
  });
});

describe('endurecimiento de funciones', () => {
  const sql = readMigrations();

  /** Bloques `create ... function` completos, tal y como aparecen. */
  function functionBlocks(): { name: string; body: string }[] {
    return [...sql.matchAll(/create or replace function public\.(\w+)[\s\S]*?\$\$;/g)].map(
      (match) => ({ name: match[1] ?? '', body: match[0] }),
    );
  }

  it('todas las funciones fijan su search_path', () => {
    // No sólo las SECURITY DEFINER: cualquier función sin search_path fijo
    // resuelve los nombres con el del que la llama, y ese es el agujero.
    const blocks = functionBlocks();
    expect(blocks.length).toBeGreaterThan(0);

    for (const { name, body } of blocks) {
      expect(body, `public.${name} no fija search_path`).toContain('set search_path');
    }
  });

  it('nadie puede invocar las funciones de trigger desde la API', () => {
    // PostgREST publica como endpoint HTTP toda función del esquema public.
    // Sin este revoke, /rest/v1/rpc/handle_new_user queda abierto a cualquiera.
    for (const name of ['set_updated_at', 'handle_new_user', 'handle_user_email_change']) {
      expect(sql, `falta revocar execute sobre public.${name}`).toMatch(
        new RegExp(`revoke execute on function public\\.${name}\\(\\)[^;]*from[^;]*anon`),
      );
      expect(sql).toMatch(
        new RegExp(`revoke execute on function public\\.${name}\\(\\)[^;]*authenticated`),
      );
    }
  });
});
