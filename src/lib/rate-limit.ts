/**
 * Rate limiting en memoria (ventana deslizante).
 *
 * Suficiente para una instancia y para frenar abuso básico. En producción con
 * varias instancias hay que moverlo a un almacén compartido (Postgres o
 * Upstash); la interfaz está pensada para poder sustituirlo sin tocar
 * quien lo consume.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  windowSeconds: number;
  max: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const bucket = buckets.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < windowMs);

  if (bucket.hits.length >= options.max) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Limpieza perezosa para que el mapa no crezca indefinidamente.
  if (buckets.size > 5000) {
    for (const [existingKey, existingBucket] of buckets) {
      if (existingBucket.hits.every((timestamp) => now - timestamp >= windowMs)) {
        buckets.delete(existingKey);
      }
    }
  }

  return {
    allowed: true,
    remaining: options.max - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

/** Sólo para tests: reinicia el estado global. */
export function resetRateLimits(): void {
  buckets.clear();
}
