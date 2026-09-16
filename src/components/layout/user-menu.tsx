'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { LogOutIcon, SettingsIcon, SparklesIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { routes } from '@/config/routes';
import { signOutAction } from '@/services/auth/auth.actions';

/** Iniciales para el avatar, con recurso al email si no hay nombre. */
function initialsFrom(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export function UserMenu({ name, email }: { name: string | null; email: string | null }) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de cuenta"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar>
          <AvatarFallback>{initialsFrom(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-medium text-foreground">{name ?? 'Tu cuenta'}</span>
          {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={routes.settings}>
            <SettingsIcon />
            Ajustes
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={routes.pricing}>
            <SparklesIcon />
            Planes y precios
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          {isPending ? <Spinner /> : <LogOutIcon />}
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
