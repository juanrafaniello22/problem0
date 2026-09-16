import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { routes } from '@/config/routes';
import { requireSessionUser } from '@/services/auth/session';

export const metadata: Metadata = {
  title: 'Empecemos',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { user, profile } = await requireSessionUser(routes.onboarding);

  // Si ya lo completó no tiene sentido repetirlo.
  if (profile?.onboarding_completed_at) redirect(routes.dashboard);

  const metadataName = user.user_metadata?.full_name;
  const defaultName =
    profile?.full_name ?? (typeof metadataName === 'string' ? metadataName : '') ?? '';

  return <OnboardingWizard defaultName={defaultName} />;
}
