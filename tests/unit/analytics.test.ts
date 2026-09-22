import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';

/** Todo el código de la app, menos la propia definición del catálogo. */
function sourceFiles(directory = 'src'): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return path === join('src', 'services', 'analytics') ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const code = sourceFiles()
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

describe('catálogo de eventos', () => {
  it('no tiene nombres repetidos', () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });

  it('todos los eventos se registran en algún sitio', () => {
    // Un evento que nadie emite es una métrica que nunca tendrá datos: o se
    // usa, o se quita del catálogo.
    const unused = ANALYTICS_EVENTS.filter((name) => !code.includes(`'${name}'`));
    expect(unused).toEqual([]);
  });

  it('la analítica nunca viaja al navegador', () => {
    // `track` toca la base de datos con la sesión o con la clave de servicio:
    // si acabara en un componente de cliente, filtraría acceso al navegador.
    expect(
      readFileSync('src/services/analytics/track.ts', 'utf8'),
    ).toContain("import 'server-only'");
  });

  it('no se envían datos personales conocidos en las propiedades', () => {
    // Heurística deliberadamente estrecha: nombres de propiedad que serían
    // una fuga clara si alguien los añadiera sin pensar.
    const forbidden = /track(Server|Once)?\([^)]*\b(email|full_name|password|message:)\b/s;
    expect(code).not.toMatch(forbidden);
  });
});
