import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Consultas con relaciones embebidas (`exam:exams(...)`).
 *
 * Es el único tipo de fallo de la capa de datos que ninguna prueba simulada
 * puede ver: lo decide PostgREST en el servidor real. Si entre dos tablas hay
 * más de un camino, se niega a adivinar y la consulta falla. Y como los
 * servicios traducen un error en una lista vacía, el alumno vería "no tienes
 * nada" sin que nada se rompiera a la vista.
 *
 * La regla: toda relación embebida nombra su clave ajena (`tabla!clave(...)`),
 * y esa clave tiene que existir en las migraciones.
 */

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

const migrations = readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join('supabase/migrations', file), 'utf8'))
  .join('\n');

const tables = new Set(
  [...migrations.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1] ?? ''),
);

/**
 * Nombres de las claves ajenas, como los pone PostgreSQL.
 *
 * Las declaradas en la columna reciben `<tabla>_<columna>_fkey`; las añadidas
 * con `add constraint` llevan el nombre que se les dio.
 */
const foreignKeys = new Set<string>();
for (const block of migrations.matchAll(
  /create table if not exists public\.(\w+) \(([\s\S]*?)\n\);/g,
)) {
  const table = block[1] ?? '';
  for (const column of (block[2] ?? '').matchAll(/(\w+) uuid[^,\n]*references public\./g)) {
    foreignKeys.add(`${table}_${column[1]}_fkey`);
  }
}
for (const named of migrations.matchAll(/add constraint (\w+)\s+foreign key/g)) {
  foreignKeys.add(named[1] ?? '');
}

/** Cada relación embebida que aparece en un texto de los servicios. */
function embeds(): { file: string; table: string; hint: string | null }[] {
  const found: { file: string; table: string; hint: string | null }[] = [];

  for (const file of filesIn('src/services')) {
    const source = readFileSync(file, 'utf8');
    // Sólo dentro de textos entre comillas: ahí viven los select.
    for (const literal of source.matchAll(/'([^'\n]*)'|`([^`]*)`/g)) {
      const text = literal[1] ?? literal[2] ?? '';
      for (const embed of text.matchAll(/(?:\w+:)?(\w+)(?:!(\w+))?\(/g)) {
        const table = embed[1] ?? '';
        if (tables.has(table)) found.push({ file, table, hint: embed[2] ?? null });
      }
    }
  }

  return found;
}

describe('relaciones embebidas en las consultas', () => {
  it('se han leído las migraciones', () => {
    // Si esto falla, el resto de comprobaciones no significarían nada.
    expect(tables.size).toBeGreaterThanOrEqual(16);
    expect(foreignKeys).toContain('study_tasks_exam_id_fkey');
    expect(foreignKeys).toContain('study_plans_current_version_fkey');
  });

  it('existe al menos una relación embebida que vigilar', () => {
    expect(embeds().length).toBeGreaterThan(0);
  });

  it('toda relación embebida nombra su clave ajena', () => {
    const sinClave = embeds().filter((embed) => embed.hint === null);
    expect(
      sinClave,
      `sin clave explícita: ${sinClave.map((e) => `${e.table} en ${e.file}`).join(', ')}`,
    ).toEqual([]);
  });

  it('la clave nombrada existe de verdad en la base de datos', () => {
    // Un nombre mal escrito no avisa al compilar: falla siempre, y en silencio.
    const inventadas = embeds().filter((embed) => embed.hint && !foreignKeys.has(embed.hint));
    expect(
      inventadas,
      `claves que no existen: ${inventadas.map((e) => e.hint).join(', ')}`,
    ).toEqual([]);
  });
});
