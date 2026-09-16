-- ---------------------------------------------------------------------------
-- Planora · Comprobación de aislamiento entre usuarios (RLS)
--
-- Verifica contra PostgreSQL de verdad que un usuario no puede leer, tocar ni
-- borrar datos de otro. Es la garantía de seguridad más importante del
-- proyecto, así que no basta con confiar en que las políticas "parecen bien".
--
-- Se ejecuta con: ./scripts/verify-rls.sh
-- ---------------------------------------------------------------------------

\set ON_ERROR_STOP on
\pset pager off

begin;

create or replace function pg_temp.ok(label text, condition boolean)
returns void language plpgsql as $$
begin
  if condition then
    raise notice '  OK    %', label;
  else
    raise exception 'FALLO: %', label;
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ana@test.local',   '{"full_name":"Ana"}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bruno@test.local', '{"full_name":"Bruno"}');

do $$
begin
  raise notice '';
  raise notice 'Alta automática de cuenta';
  perform pg_temp.ok('crea un perfil por usuario',
    (select count(*) from public.profiles) = 2);
  perform pg_temp.ok('crea los ajustes por usuario',
    (select count(*) from public.user_settings) = 2);
  perform pg_temp.ok('el nombre del registro llega al perfil',
    (select full_name from public.profiles where email = 'ana@test.local') = 'Ana');
  perform pg_temp.ok('el consentimiento de marketing es falso por defecto',
    (select bool_and(marketing_opt_in = false) from public.user_settings));
end $$;

insert into public.exams (id, user_id, title, exam_date) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mates de Ana', '2099-10-15'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Física de Bruno', '2099-10-20');

insert into public.topics (user_id, exam_id, name, position) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Derivadas', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Cinemática', 0);

insert into public.study_plans (id, user_id, exam_id) values
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
insert into public.study_plan_versions (id, user_id, plan_id, version, source) values
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 1, 'deterministic');

insert into public.analytics_events (user_id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'exam_created');

-- A partir de aquí actuamos como Ana, con el rol de un usuario autenticado.
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

do $$
begin
  raise notice '';
  raise notice 'Lectura · Ana sólo ve lo suyo';
  perform pg_temp.ok('sólo ve su perfil', (select count(*) from public.profiles) = 1);
  perform pg_temp.ok('sólo ve sus ajustes', (select count(*) from public.user_settings) = 1);
  perform pg_temp.ok('sólo ve su examen', (select count(*) from public.exams) = 1);
  perform pg_temp.ok('sólo ve sus temas', (select count(*) from public.topics) = 1);
  perform pg_temp.ok('sólo ve sus planes', (select count(*) from public.study_plans) = 1);
  perform pg_temp.ok('sólo ve sus versiones de plan',
    (select count(*) from public.study_plan_versions) = 1);
  perform pg_temp.ok('sólo ve sus eventos', (select count(*) from public.analytics_events) = 1);
end $$;

do $$
declare affected integer;
begin
  raise notice '';
  raise notice 'Escritura · Ana no puede tocar lo de Bruno';

  update public.exams set title = 'HACKEADO'
    where id = '22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  perform pg_temp.ok('no puede modificar el examen de otro', affected = 0);

  delete from public.exams where id = '22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  perform pg_temp.ok('no puede borrar el examen de otro', affected = 0);

  delete from public.topics where name = 'Cinemática';
  get diagnostics affected = row_count;
  perform pg_temp.ok('no puede borrar los temas de otro', affected = 0);

  delete from public.profiles where email = 'bruno@test.local';
  get diagnostics affected = row_count;
  perform pg_temp.ok('no puede borrar el perfil de otro', affected = 0);

  update public.analytics_events set name = 'falseado';
  get diagnostics affected = row_count;
  perform pg_temp.ok('no puede falsear los eventos de analítica', affected = 0);
end $$;

do $$
begin
  raise notice '';
  raise notice 'Escritura · comprobaciones cruzadas';

  begin
    insert into public.topics (user_id, exam_id, name)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'Intruso');
    raise exception 'FALLO: pudo colar un tema en el examen de otro usuario';
  exception when insufficient_privilege then
    raise notice '  OK    no puede colar un tema en el examen de otro';
  end;

  begin
    insert into public.topics (user_id, exam_id, name)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Intruso');
    raise exception 'FALLO: pudo suplantar a otro usuario al insertar';
  exception when insufficient_privilege then
    raise notice '  OK    no puede suplantar a otro usuario';
  end;

  begin
    insert into public.topics (user_id, exam_id, name, position)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Integrales', 1);
    raise notice '  OK    sí puede añadir temas a su propio examen';
  exception when insufficient_privilege then
    raise exception 'FALLO: no pudo añadir un tema a su propio examen';
  end;

  begin
    insert into public.study_tasks
      (user_id, exam_id, plan_version_id, topic_label, scheduled_date, duration_minutes)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
            '44444444-4444-4444-8444-444444444444', 'Derivadas', '2099-09-20', 45);
    raise notice '  OK    sí puede crear tareas en su propio plan';
  exception when insufficient_privilege then
    raise exception 'FALLO: no pudo crear una tarea en su propio plan';
  end;
end $$;

reset role;
reset request.jwt.claim.sub;

do $$
begin
  raise notice '';
  raise notice 'Restricciones de integridad';

  begin
    insert into public.exams (user_id, title, exam_date, available_weekdays)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sin días', '2099-11-01', '{}');
    raise exception 'FALLO: aceptó un examen sin días disponibles';
  exception when check_violation then
    raise notice '  OK    rechaza un examen sin días disponibles';
  end;

  begin
    insert into public.exams (user_id, title, exam_date, available_weekdays)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Días raros', '2099-11-01', '{0,9}');
    raise exception 'FALLO: aceptó días de la semana inválidos';
  exception when check_violation then
    raise notice '  OK    rechaza días de la semana inválidos';
  end;

  begin
    insert into public.study_tasks
      (user_id, exam_id, plan_version_id, topic_label, scheduled_date, duration_minutes, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
            '44444444-4444-4444-8444-444444444444', 'Derivadas', '2099-09-21', 45, 'completed');
    raise exception 'FALLO: aceptó una tarea completada sin fecha de finalización';
  exception when check_violation then
    raise notice '  OK    exige fecha al completar una tarea';
  end;

  begin
    insert into public.topics (user_id, exam_id, name)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'derivadas');
    raise exception 'FALLO: aceptó un tema duplicado';
  exception when unique_violation then
    raise notice '  OK    rechaza temas duplicados en el mismo examen';
  end;
end $$;

do $$
begin
  raise notice '';
  raise notice 'Borrado en cascada y anonimización';

  delete from public.exams where id = '11111111-1111-4111-8111-111111111111';
  perform pg_temp.ok('al borrar el examen desaparecen sus temas',
    (select count(*) from public.topics
      where exam_id = '11111111-1111-4111-8111-111111111111') = 0);
  perform pg_temp.ok('al borrar el examen desaparecen su plan y sus tareas',
    (select count(*) from public.study_plans
      where exam_id = '11111111-1111-4111-8111-111111111111') = 0
    and (select count(*) from public.study_tasks
      where exam_id = '11111111-1111-4111-8111-111111111111') = 0);

  delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  perform pg_temp.ok('al borrar la cuenta desaparece el perfil',
    (select count(*) from public.profiles where email = 'ana@test.local') = 0);
  perform pg_temp.ok('el evento se conserva anonimizado, sin usuario',
    (select count(*) from public.analytics_events where user_id is null) = 1);
end $$;

rollback;

\echo ''
\echo '  Todas las comprobaciones de RLS han pasado.'
\echo ''
