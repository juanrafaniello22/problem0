-- ---------------------------------------------------------------------------
-- Planora · Migración 0008 — Sustituir los temas de un examen de una vez
--
-- Antes lo hacía la aplicación en varias peticiones: borrar los quitados,
-- renombrar uno a uno y crear los nuevos. Probado contra la base de datos
-- real, eso fallaba en un caso normal: quien reescribe la lista "subiendo"
-- los nombres (Límites, Derivadas, Integrales → Derivadas, Integrales) choca
-- con el índice único, porque al renombrar el primero a "Derivadas" el
-- segundo todavía se llama así.
--
-- Y fallaba a medias: el borrado ya se había guardado en su propia petición,
-- así que el alumno veía un error Y se quedaba sin un tema.
--
-- Esta función arregla las dos cosas:
--   · Todo ocurre en una sola transacción: o se aplica entero, o nada.
--   · Los temas que cambian de nombre pasan antes por un nombre provisional
--     único, así que ningún orden de renombrado puede chocar.
--
-- Seguridad: SECURITY INVOKER, es decir, corre con los permisos de quien la
-- llama. Las políticas RLS de `topics` siguen aplicándose a cada sentencia.
-- Además comprueba al principio que el examen es suyo, para fallar con un
-- error claro en lugar de "no hacer nada" en silencio.
-- ---------------------------------------------------------------------------

create or replace function public.replace_topics(p_exam_id uuid, p_topics jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sesión no válida' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.exams e where e.id = p_exam_id and e.user_id = v_user
  ) then
    raise exception 'Examen no encontrado' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_topics) is distinct from 'array' then
    raise exception 'La lista de temas no es válida' using errcode = '22023';
  end if;

  -- p_topics: [{ "id": uuid | null, "name": text }, …] en el orden deseado.

  -- 1. Fuera los que ya no están en la lista.
  delete from public.topics t
   where t.exam_id = p_exam_id
     and t.user_id = v_user
     and not exists (
       select 1 from jsonb_array_elements(p_topics) d where d ->> 'id' = t.id::text
     );

  -- 2. Los que cambian de nombre pasan por uno provisional y único. Así, al
  --    poner los definitivos, ningún orden de renombrado puede chocar.
  update public.topics t
     set name = '~' || t.id::text
    from jsonb_array_elements(p_topics) d
   where d ->> 'id' = t.id::text
     and t.exam_id = p_exam_id
     and t.user_id = v_user
     and t.name is distinct from btrim(d ->> 'name');

  -- 3. Nombre y posición definitivos, sólo donde algo cambia.
  update public.topics t
     set name = btrim(d.value ->> 'name'),
         position = (d.ordinality - 1)::integer
    from jsonb_array_elements(p_topics) with ordinality d
   where d.value ->> 'id' = t.id::text
     and t.exam_id = p_exam_id
     and t.user_id = v_user
     and (
       t.name is distinct from btrim(d.value ->> 'name')
       or t.position is distinct from (d.ordinality - 1)::integer
     );

  -- 4. Los nuevos. Un id que no es de este examen se trata como tema nuevo,
  --    igual que hacía la aplicación: nunca se toca un tema de otro examen.
  insert into public.topics (user_id, exam_id, name, position)
  select v_user, p_exam_id, btrim(d.value ->> 'name'), (d.ordinality - 1)::integer
    from jsonb_array_elements(p_topics) with ordinality d
   where d.value ->> 'id' is null
      or not exists (
        select 1 from public.topics t
         where t.id::text = d.value ->> 'id' and t.exam_id = p_exam_id
      );
end;
$$;

-- La usa la aplicación con la sesión del alumno. Nadie sin sesión.
revoke execute on function public.replace_topics(uuid, jsonb) from public, anon;
grant execute on function public.replace_topics(uuid, jsonb) to authenticated;
