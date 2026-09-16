import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { routes } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description: 'Recupera el acceso a tu cuenta de Planora.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="¿Has olvidado tu contraseña?"
      description="Sin problema. Te enviamos un enlace para crear una nueva."
      footer={{ text: '¿Te has acordado?', linkLabel: 'Volver a entrar', href: routes.login }}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
