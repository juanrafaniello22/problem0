import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { routes } from '@/config/routes';
import { siteConfig } from '@/config/site';

const columns = [
  {
    title: 'Producto',
    links: [
      { href: '/#como-funciona', label: 'Cómo funciona' },
      { href: '/#funcionalidades', label: 'Funcionalidades' },
      { href: routes.pricing, label: 'Precios' },
      { href: '/#faq', label: 'Preguntas frecuentes' },
    ],
  },
  {
    title: 'Cuenta',
    links: [
      { href: routes.signup, label: 'Crear cuenta' },
      { href: routes.login, label: 'Entrar' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: routes.privacy, label: 'Privacidad' },
      { href: routes.terms, label: 'Términos' },
      { href: routes.cookies, label: 'Cookies' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. Hecho para estudiantes.
          </p>
          <a
            href={siteConfig.links.support}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Soporte
          </a>
        </div>
      </div>
    </footer>
  );
}
