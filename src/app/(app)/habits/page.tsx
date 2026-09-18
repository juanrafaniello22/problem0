import type { Metadata } from 'next';
import { HabitsView } from '@/components/habits/habits-view';
import { todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { remainingFor } from '@/services/billing/entitlements';
import { getUserUsage } from '@/services/billing/subscription.service';
import { listHabitsWithProgress } from '@/services/habits/habit.service';

export const metadata: Metadata = { title: 'Hábitos', robots: { index: false, follow: false } };

export default async function HabitsPage() {
  const { user, profile } = await requireSessionUser();
  const today = todayIso(profile?.timezone ?? undefined);

  const [habits, usage] = await Promise.all([
    listHabitsWithProgress(user.id, today),
    getUserUsage(user.id),
  ]);

  return (
    <HabitsView
      habits={habits}
      today={today}
      remaining={remainingFor(usage, 'create_habit')}
    />
  );
}
