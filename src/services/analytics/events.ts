/**
 * Catálogo de eventos de producto.
 * Mantener la lista cerrada evita nombres inventados y facilita el análisis.
 */

export const ANALYTICS_EVENTS = [
  'signup',
  'login',
  'onboarding_started',
  'onboarding_completed',
  'onboarding_skipped',
  'exam_created',
  'generate_plan',
  'first_plan_created',
  'complete_task',
  'start_focus',
  'finish_focus',
  'habit_created',
  'habit_completed',
  'replan_requested',
  'upgrade_clicked',
  'checkout_started',
  'subscription_created',
  'subscription_cancelled',
  'feedback_sent',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/** Propiedades permitidas: valores primitivos, nunca datos personales. */
export type AnalyticsProperties = Record<string, string | number | boolean | null>;
