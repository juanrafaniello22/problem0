import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';
import { absoluteUrl, siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso del servicio Planora.',
  alternates: { canonical: absoluteUrl('/terms') },
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updatedAt="16 de septiembre de 2026">
      <section>
        <h2>1. Objeto</h2>
        <p>
          Estas condiciones regulan el acceso y uso de {siteConfig.name}, una aplicación web que
          ayuda a organizar el estudio generando planes a partir de la información que introduce la
          persona usuaria.
        </p>
      </section>

      <section>
        <h2>2. Cuenta</h2>
        <ul>
          <li>Debes facilitar información veraz al registrarte.</li>
          <li>Eres responsable de mantener la confidencialidad de tus credenciales.</li>
          <li>Una cuenta es personal e intransferible.</li>
        </ul>
      </section>

      <section>
        <h2>3. Uso aceptable</h2>
        <p>No está permitido:</p>
        <ul>
          <li>Intentar acceder a datos de otras personas usuarias.</li>
          <li>Automatizar el uso del servicio para saturarlo o extraer datos masivamente.</li>
          <li>Subir contenido ilícito o que infrinja derechos de terceros.</li>
          <li>Revender o redistribuir el servicio sin autorización.</li>
        </ul>
      </section>

      <section>
        <h2>4. Planes y pago</h2>
        <p>
          Existe un plan gratuito con límites de uso y un plan de pago (Pro) por suscripción
          mensual o anual. Los pagos los procesa Stripe. La suscripción se renueva automáticamente
          salvo cancelación. Puedes cancelar cuando quieras: mantendrás el acceso hasta el final del
          periodo ya facturado y no se emitirán reembolsos parciales del periodo en curso, salvo
          que la ley aplicable lo exija.
        </p>
      </section>

      <section>
        <h2>5. Derecho de desistimiento</h2>
        <p>
          Si contratas como consumidor en la UE dispones de 14 días naturales para desistir. Al
          activarse el servicio de forma inmediata, el desistimiento puede verse afectado conforme a
          la normativa aplicable de contenidos y servicios digitales. Pendiente de concretar con
          revisión legal.
        </p>
      </section>

      <section>
        <h2>6. Contenido generado por IA</h2>
        <p>
          Los planes de estudio los genera un modelo de inteligencia artificial a partir de los
          datos que tú introduces. Son una propuesta de organización, no asesoramiento académico ni
          una garantía de resultado. Revisa siempre que el plan encaja con el temario oficial de tu
          examen.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidad y responsabilidad</h2>
        <p>
          Trabajamos para que el servicio esté disponible de forma continua, pero no garantizamos su
          funcionamiento ininterrumpido. En la medida permitida por la ley, no respondemos de daños
          indirectos derivados del uso del servicio. Nada en estas condiciones limita los derechos
          que la normativa de consumo te reconoce.
        </p>
      </section>

      <section>
        <h2>8. Modificaciones y ley aplicable</h2>
        <p>
          Podemos actualizar estas condiciones avisando con antelación razonable de los cambios
          relevantes. Se aplica la legislación española y, para las personas consumidoras, los
          tribunales de su domicilio.
        </p>
      </section>
    </LegalPage>
  );
}
