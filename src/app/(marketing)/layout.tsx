import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';

/**
 * Layout público.
 *
 * No consulta la sesión a propósito: así la landing se prerrenderiza de forma
 * estática y carga rápido desde móvil, que es de donde llegará el tráfico.
 * Quien ya tenga sesión y pulse «Entrar» acaba en su panel: el proxy redirige
 * las rutas de autenticación cuando hay sesión activa.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
