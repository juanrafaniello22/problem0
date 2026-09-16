import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <p className="font-display text-5xl font-bold tracking-tight">404</p>
        <h1 className="mt-3 text-xl font-semibold">Esta página no existe</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito o que la página se haya movido.
        </p>
      </div>
      <Button asChild>
        <Link href={routes.home}>Volver al inicio</Link>
      </Button>
    </div>
  );
}
