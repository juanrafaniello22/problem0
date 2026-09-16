import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';
import { absoluteUrl } from '@/config/site';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Qué cookies y almacenamiento local usa Planora y para qué.',
  alternates: { canonical: absoluteUrl('/cookies') },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies" updatedAt="16 de septiembre de 2026">
      <section>
        <h2>1. Qué usamos</h2>
        <p>
          Planora usa el mínimo imprescindible. Hoy no cargamos cookies publicitarias ni de
          seguimiento de terceros.
        </p>
      </section>

      <section>
        <h2>2. Cookies técnicas (necesarias)</h2>
        <ul>
          <li>
            <strong>Sesión de autenticación:</strong> cookies gestionadas por Supabase que mantienen
            tu sesión iniciada. Sin ellas no podrías usar la aplicación.
          </li>
          <li>
            <strong>Preferencia de tema:</strong> guardamos en tu navegador si prefieres modo claro
            u oscuro.
          </li>
        </ul>
        <p>
          Estas cookies están exentas de consentimiento por ser estrictamente necesarias para
          prestar el servicio que solicitas.
        </p>
      </section>

      <section>
        <h2>3. Analítica de producto</h2>
        <p>
          Registramos eventos de uso (por ejemplo: has creado un examen, has generado un plan) en
          nuestra propia base de datos, asociados a tu cuenta. No usamos cookies de terceros para
          ello ni construimos perfiles publicitarios.
        </p>
      </section>

      <section>
        <h2>4. Si en el futuro añadimos cookies no necesarias</h2>
        <p>
          Antes de instalarlas te pediremos consentimiento mediante un banner con opciones reales de
          aceptar y rechazar, y actualizaremos esta página.
        </p>
      </section>

      <section>
        <h2>5. Cómo gestionarlas</h2>
        <p>
          Puedes borrar o bloquear cookies desde la configuración de tu navegador. Ten en cuenta que
          bloquear las cookies técnicas impedirá que puedas iniciar sesión.
        </p>
      </section>
    </LegalPage>
  );
}
