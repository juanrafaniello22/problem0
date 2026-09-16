/**
 * Utilidades de fecha en formato ISO `YYYY-MM-DD` (día natural, sin horas).
 * Planora razona en días, no en instantes: usar cadenas evita los errores
 * clásicos de zona horaria al comparar "hoy" con la fecha de un examen.
 */

export type IsoDate = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}

export function toIsoDate(date: Date): IsoDate {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fecha de hoy en la zona horaria indicada (por defecto, la del entorno). */
export function todayIso(timeZone?: string): IsoDate {
  const now = new Date();
  if (!timeZone) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function parseIsoDate(value: IsoDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/** Días completos entre dos fechas (`to - from`). Puede ser negativo. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const ms = parseIsoDate(to).getTime() - parseIsoDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(value: IsoDate): number {
  const day = parseIsoDate(value).getUTCDay();
  return day === 0 ? 7 : day;
}

const LONG_DATE = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const SHORT_DATE = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const WEEKDAY = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' });

export function formatLongDate(value: IsoDate): string {
  return LONG_DATE.format(parseIsoDate(value));
}

export function formatShortDate(value: IsoDate): string {
  return SHORT_DATE.format(parseIsoDate(value));
}

export function formatWeekday(value: IsoDate): string {
  const label = WEEKDAY.format(parseIsoDate(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Etiqueta humana para la cuenta atrás de un examen. */
export function countdownLabel(from: IsoDate, examDate: IsoDate): string {
  const days = daysBetween(from, examDate);
  if (days < 0) return 'Examen pasado';
  if (days === 0) return '¡Hoy es el examen!';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

/** Convierte minutos a un texto compacto: 45 min · 1 h 30 min. */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Saludo según la hora local del usuario. */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 14) return 'Buenos días';
  if (hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Hora local (0–23) en una zona horaria concreta. */
export function hourInTimeZone(timeZone: string, now: Date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    }).format(now);
    const hour = Number.parseInt(formatted, 10);
    return Number.isNaN(hour) ? now.getHours() : hour % 24;
  } catch {
    // Zona horaria inválida: caemos a la del servidor en lugar de romper.
    return now.getHours();
  }
}

/** Saludo adaptado a la zona horaria del usuario. */
export function greetingForTimeZone(timeZone: string, now: Date = new Date()): string {
  const hour = hourInTimeZone(timeZone, now);
  if (hour < 6) return 'Buenas noches';
  if (hour < 14) return 'Buenos días';
  if (hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
