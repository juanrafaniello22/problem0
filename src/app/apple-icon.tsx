import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Icono de la app para iOS y para la instalación como PWA. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
          paddingLeft: 38,
          background: 'linear-gradient(135deg, #7C5CFF 0%, #5B3FE0 100%)',
        }}
      >
        <div style={{ width: 104, height: 26, borderRadius: 13, background: '#fff' }} />
        <div style={{ width: 72, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.62)' }} />
        <div style={{ width: 40, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.34)' }} />
      </div>
    ),
    size,
  );
}
