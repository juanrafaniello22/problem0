import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { SignUpForm } from '@/components/auth/signup-form';
import { LoadingState } from '@/components/ui/spinner';
import { routes } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Crea tu cuenta de Planora y genera tu primer plan de estudio con IA.',
  robots: { index: true, follow: true },
};

export default function SignUpPage() {
  return (
    <AuthCard
      title="Crea tu plan gratis"
      description="Tu primer plan de estudio en menos de 2 minutos."
      footer={{ text: '¿Ya tienes cuenta?', linkLabel: 'Entrar', href: routes.login }}
    >
      <Suspense fallback={<LoadingState />}>
        <SignUpForm />
      </Suspense>
    </AuthCard>
  );
}
