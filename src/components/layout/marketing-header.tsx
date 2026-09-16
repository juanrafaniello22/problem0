'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MenuIcon, XIcon } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: routes.pricing, label: 'Precios' },
  { href: '#faq', label: 'FAQ' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-colors duration-200',
        scrolled
          ? 'border-b border-border bg-background/85 backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={routes.home} className="rounded-lg" aria-label="Planora, inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.login}>Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={routes.signup}>Crear mi plan gratis</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-16 z-50 h-[calc(100dvh-4rem)] animate-fade-in bg-background px-4 pb-8 pt-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Principal móvil">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3.5 text-lg font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href={routes.signup}>Crear mi plan gratis</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={routes.login}>Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
