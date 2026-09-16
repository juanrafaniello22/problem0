import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { routes } from '@/config/routes';

export function AppHeader({ name, email }: { name: string | null; email: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <Link href={routes.dashboard} aria-label="Planora" className="rounded-lg lg:hidden">
        <Logo markClassName="size-7" />
      </Link>
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
