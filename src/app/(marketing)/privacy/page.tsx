import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';
import { absoluteUrl, siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos trata Planora, con qué finalidad y qué derechos tienes sobre ellos.',
  alternates: { canonical: absoluteUrl('/privacy') },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updatedAt="16 de septiembre de 2026">
      <section>
        <h2>1. Quién trata tus datos</h2>
        <p>
          El responsable del tratamiento es la entidad que explota {siteConfig.name} (pendiente de
          concretar: denominación social, NIF y domicilio). Puedes contactar en{' '}
          <strong>hola@planora.app</strong>.
        </p>
      </section>

      <section>
        <h2>2. Qué datos tratamos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> email y contraseña (gestionada y cifrada por nuestro proveedor
            de autenticación, Supabase; nunca almacenamos contraseñas en claro).
          </li>
          <li>
            <strong>Perfil:</strong> nombre, nivel educativo, objetivo de estudio y tiempo
            disponible al día, si decides indicarlos.
          </li>
          <li>
            <strong>Contenido de estudio:</strong> exámenes, asignaturas, temas, planes, tareas,
            hábitos y sesiones de estudio que creas dentro de la aplicación.
          </li>
          <li>
            <strong>Uso del producto:</strong> eventos básicos (registro, creación de examen,
            generación de plan, tarea completada) asociados a tu identificador de usuario.
          </li>
          <li>
            <strong>Pago:</strong> si te suscribes, Stripe trata los datos de pago. Nosotros
            guardamos el estado de la suscripción y el identificador de cliente, nunca el número de
            tarjeta.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Para qué los usamos y con qué base legal</h2>
        <ul>
          <li>
            <strong>Prestar el servicio</strong> (crear tu cuenta, generar y guardar tus planes):
            ejecución del contrato.
          </li>
          <li>
            <strong>Mejorar el producto</strong> mediante métricas agregadas de uso: interés
            legítimo.
          </li>
          <li>
            <strong>Cobrar la suscripción</strong> y cumplir obligaciones fiscales: ejecución del
            contrato y obligación legal.
          </li>
          <li>
            <strong>Enviarte comunicaciones comerciales:</strong> sólo con tu consentimiento
            expreso, que puedes retirar en cualquier momento.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Generación de planes con IA</h2>
        <p>
          Para crear tu plan enviamos a nuestro proveedor de IA los datos estrictamente necesarios:
          fecha del examen, nombres de los temas, dificultad y tu disponibilidad. No enviamos tu
          email, tu nombre ni tu identificador de usuario. El contenido que escribas en los nombres
          de temas sí se envía, así que evita incluir datos personales en ellos.
        </p>
      </section>

      <section>
        <h2>5. Quién más accede a tus datos</h2>
        <ul>
          <li>Supabase (autenticación y base de datos).</li>
          <li>Vercel (alojamiento de la aplicación).</li>
          <li>Stripe (pagos y suscripciones).</li>
          <li>El proveedor de IA configurado para generar los planes.</li>
        </ul>
        <p>
          Todos actúan como encargados del tratamiento. No vendemos tus datos a terceros ni los
          cedemos con fines publicitarios.
        </p>
      </section>

      <section>
        <h2>6. Cuánto tiempo los conservamos</h2>
        <p>
          Mientras tengas la cuenta activa. Si la eliminas, borramos tu perfil y tu contenido de
          estudio y anonimizamos los eventos de uso, salvo los datos que debamos conservar por
          obligación legal (por ejemplo, facturación).
        </p>
      </section>

      <section>
        <h2>7. Tus derechos</h2>
        <p>
          Puedes acceder, rectificar, suprimir, limitar u oponerte al tratamiento, y solicitar la
          portabilidad de tus datos, escribiendo a <strong>hola@planora.app</strong>. Desde Ajustes
          puedes eliminar tu cuenta directamente. También puedes reclamar ante la Agencia Española
          de Protección de Datos (aepd.es).
        </p>
      </section>

      <section>
        <h2>8. Menores de edad</h2>
        <p>
          Planora está pensada para estudiantes. Si tienes menos de 14 años, necesitas la
          autorización de tu madre, padre o tutor legal para usar el servicio.
        </p>
      </section>
    </LegalPage>
  );
}
