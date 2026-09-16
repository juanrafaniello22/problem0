import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { LoadingState } from '@/components/ui/spinner';
import { routes } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Accede a tu plan de estudio en Planora.',
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Bienvenido de vuelta"
      description="Entra para ver qué te toca estudiar hoy."
      footer={{ text: '¿Aún no tienes cuenta?', linkLabel: 'Crear cuenta', href: routes.signup }}
    >
      <Suspense fallback={<LoadingState />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
