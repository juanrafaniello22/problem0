-- ---------------------------------------------------------------------------
-- Planora · Migración 0007 — Índices que faltaban en claves foráneas
--
-- PostgreSQL no indexa automáticamente el lado hijo de una clave foránea.
-- Cuando se borra la fila padre tiene que comprobar los hijos, y sin índice
-- eso significa recorrer la tabla entera.
--
-- Las cuatro que faltaban están justo en los caminos de borrado que la
-- aplicación usa de verdad:
--
--   · topics      → al replanificar se rehacen los temas, y cada uno obliga a
--                   repasar study_tasks. Es el que más va a doler.
--   · exams       → al borrar un examen se repasa ai_generations.
--   · profiles    → al borrar la cuenta se repasa feedback.
--   · versions    → al borrar una versión se repasa study_plans.
--
-- El analizador también avisa de "índices sin usar". Eso hoy no significa
-- nada: la base de datos está recién creada y no ha servido ninguna consulta
-- todavía. Se revisa dentro de unos meses, con datos reales.
-- ---------------------------------------------------------------------------

create index if not exists study_tasks_topic_idx
  on public.study_tasks (topic_id);

create index if not exists ai_generations_exam_idx
  on public.ai_generations (exam_id);

create index if not exists feedback_user_idx
  on public.feedback (user_id);

create index if not exists study_plans_current_version_idx
  on public.study_plans (current_version_id);
