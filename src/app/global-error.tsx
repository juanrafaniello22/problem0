'use client';

import { useEffect } from 'react';

/**
 * Último recinto: un fallo en el propio layout raíz.
 *
 * Aquí no hay layout, ni fuentes, ni hoja de estilos (Next sustituye el árbol
 * entero), así que va con estilos en línea. Sin esto, el usuario vería la
 * pantalla de error genérica del navegador.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error global', { digest: error.digest });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#FBFBFE',
          color: '#14141F',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '26rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Planora no ha podido cargar
          </h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.75 }}>
            Ha fallado algo al arrancar la página. Vuelve a intentarlo; si sigue igual, prueba en
            unos minutos.
          </p>
          {error.digest && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.6 }}>
              Código de referencia: <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              minHeight: '2.75rem',
              padding: '0 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#5B3FE0',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
