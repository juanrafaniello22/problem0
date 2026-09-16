import { describe, expect, it } from 'vitest';
import {
  addDays,
  countdownLabel,
  daysBetween,
  formatMinutes,
  greetingForTimeZone,
  hourInTimeZone,
  isIsoDate,
  isoWeekday,
  todayIso,
} from '@/lib/date';

describe('isIsoDate', () => {
  it('acepta fechas ISO válidas', () => {
    expect(isIsoDate('2026-10-15')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('rechaza formatos incorrectos y fechas imposibles', () => {
    expect(isIsoDate('15/10/2026')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2025-02-29')).toBe(false);
  });
});

describe('addDays', () => {
  it('suma días cruzando el cambio de mes', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('resta días cruzando el cambio de año', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('cruza correctamente un 29 de febrero bisiesto', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('daysBetween', () => {
  it('cuenta los días entre dos fechas', () => {
    expect(daysBetween('2026-09-16', '2026-10-15')).toBe(29);
  });

  it('devuelve 0 para el mismo día', () => {
    expect(daysBetween('2026-09-16', '2026-09-16')).toBe(0);
  });

  it('devuelve negativo si la fecha destino ya pasó', () => {
    expect(daysBetween('2026-09-16', '2026-09-10')).toBe(-6);
  });

  it('no se descuadra al cruzar un cambio de hora', () => {
    // Último domingo de marzo: cambio de hora en la UE.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('isoWeekday', () => {
  it('devuelve 1 para lunes y 7 para domingo', () => {
    expect(isoWeekday('2026-09-14')).toBe(1);
    expect(isoWeekday('2026-09-20')).toBe(7);
  });
});

describe('countdownLabel', () => {
  it('describe el tiempo que queda hasta el examen', () => {
    expect(countdownLabel('2026-09-16', '2026-09-16')).toBe('¡Hoy es el examen!');
    expect(countdownLabel('2026-09-16', '2026-09-17')).toBe('Mañana');
    expect(countdownLabel('2026-09-16', '2026-09-26')).toBe('En 10 días');
    expect(countdownLabel('2026-09-16', '2026-09-10')).toBe('Examen pasado');
  });
});

describe('formatMinutes', () => {
  it('formatea minutos y horas de forma compacta', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });

  it('nunca devuelve tiempos negativos', () => {
    expect(formatMinutes(-30)).toBe('0 min');
  });
});

describe('hourInTimeZone', () => {
  it('lee la hora en la zona indicada', () => {
    const noonUtc = new Date('2026-06-15T12:00:00.000Z');
    expect(hourInTimeZone('UTC', noonUtc)).toBe(12);
    expect(hourInTimeZone('Europe/Madrid', noonUtc)).toBe(14);
  });

  it('no rompe con una zona horaria inválida', () => {
    expect(() => hourInTimeZone('No/Existe', new Date())).not.toThrow();
  });
});

describe('greetingForTimeZone', () => {
  it('elige el saludo según la franja horaria', () => {
    expect(greetingForTimeZone('UTC', new Date('2026-06-15T09:00:00.000Z'))).toBe('Buenos días');
    expect(greetingForTimeZone('UTC', new Date('2026-06-15T16:00:00.000Z'))).toBe('Buenas tardes');
    expect(greetingForTimeZone('UTC', new Date('2026-06-15T23:00:00.000Z'))).toBe('Buenas noches');
    expect(greetingForTimeZone('UTC', new Date('2026-06-15T03:00:00.000Z'))).toBe('Buenas noches');
  });
});

describe('todayIso', () => {
  it('devuelve una fecha con formato ISO válido', () => {
    expect(isIsoDate(todayIso())).toBe(true);
    expect(isIsoDate(todayIso('Europe/Madrid'))).toBe(true);
  });
});
