import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AiUsageCard } from '@/components/settings/ai-usage-card';
import { DangerZone } from '@/components/settings/danger-zone';
import { FeedbackCard } from '@/components/settings/feedback-card';
import { SubscriptionCard } from '@/components/settings/subscription-card';
import { ProfileForm } from '@/components/settings/profile-form';
import { SignOutButton } from '@/components/settings/sign-out-button';
import { ThemeSelector } from '@/components/settings/theme-selector';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/config/routes';
import { requireSessionUser } from '@/services/auth/session';
import {
  getSubscriptionSummary,
  getUserUsage,
} from '@/services/billing/subscription.service';
import { limitsFor } from '@/config/limits';

export const metadata: Metadata = { title: 'Ajustes', robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const { user, profile } = await requireSessionUser(routes.settings);

  // El perfil se crea con el usuario; si falta, algo ha ido mal en el alta.
  if (!profile) redirect(routes.onboarding);

  const [usage, subscription] = await Promise.all([
    getUserUsage(user.id),
    getSubscriptionSummary(user.id),
  ]);
  const limits = limitsFor(usage.plan);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ajustes" description="Tu cuenta y tus preferencias." />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>
            Estos datos se usan para ajustar la duración de tus sesiones de estudio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>El email con el que entras en Planora.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface-muted/50 px-4 py-3">
            <p className="truncate text-sm font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">Email de la cuenta</p>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>

      <SubscriptionCard summary={subscription} />

      <AiUsageCard
        used={usage.aiGenerationsThisMonth}
        limit={limits.aiGenerationsPerMonth}
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Elige cómo quieres ver Planora.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      <FeedbackCard />

      <DangerZone email={user.email ?? ''} isPro={subscription.plan === 'pro'} />
    </div>
  );
}
