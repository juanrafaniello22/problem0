'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { appNavItems } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-muted/40 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href={routes.dashboard} aria-label="Planora" className="rounded-lg">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="Secciones">
        {appNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface/70 hover:text-foreground',
              )}
            >
              <item.icon className={cn('size-[1.15rem]', active && 'text-primary')} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.upcoming && (
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pronto
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
