'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appNavItems } from '@/config/navigation';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra inferior: la navegación principal en móvil, con objetivos grandes. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      aria-label="Secciones"
    >
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {appNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[0.6875rem] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="size-[1.3rem]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
