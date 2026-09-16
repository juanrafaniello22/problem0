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
        'analytics_events',
        'exams',
        'feedback',
        'profiles',
        'study_plan_versions',
        'study_plans',
        'study_tasks',
        'subjects',
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
    for (const table of tableNames()) {
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
    for (const table of tableNames()) {
      if (table === 'profiles') continue;
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
