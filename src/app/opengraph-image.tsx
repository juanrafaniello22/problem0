import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagen que se muestra al compartir Planora en redes y mensajería. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#FBFBFE',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 19,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 5,
              paddingLeft: 14,
              background: 'linear-gradient(135deg, #7C5CFF 0%, #5B3FE0 100%)',
            }}
          >
            <div style={{ width: 36, height: 9, borderRadius: 5, background: '#fff' }} />
            <div style={{ width: 25, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.62)' }} />
            <div style={{ width: 14, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.34)' }} />
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: '#1A1A2E', letterSpacing: -1 }}>
            Planora
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              color: '#15152B',
              letterSpacing: -2.6,
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            Tu plan de estudio. Creado por IA.
          </div>
          <div style={{ fontSize: 32, color: '#5C5C74', maxWidth: 900, lineHeight: 1.35 }}>
            Dile qué tienes que estudiar y cuándo es el examen. Planora organiza el camino.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['Examen', 'Temas', 'Disponibilidad', 'Plan diario'].map((step) => (
            <div
              key={step}
              style={{
                display: 'flex',
                fontSize: 24,
                color: '#5B3FE0',
                background: '#EFEBFF',
                padding: '12px 22px',
                borderRadius: 999,
              }}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
