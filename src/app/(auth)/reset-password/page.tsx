import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Nueva contraseña',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Crea una contraseña nueva"
      description="Elige una que puedas recordar pero nadie pueda adivinar."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
