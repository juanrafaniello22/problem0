import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { requireServerEnv } from '@/config/env.server';
import { logger } from '@/lib/logger';
import { getStripe } from '@/lib/stripe';
import {
  markEventProcessed,
  syncSubscription,
} from '@/services/billing/stripe.service';

/**
 * Webhook de Stripe.
 *
 * Es la ÚNICA vía por la que se concede o se retira el acceso Pro. Visitar
 * /success no activa nada: esa página sólo muestra el estado que ya haya
 * llegado por aquí.
 *
 * Tres reglas:
 *
 * 1. Se valida la firma SIEMPRE, con el cuerpo crudo. Sin firma válida, 400 y
 *    no se toca nada. Cualquiera puede llamar a esta URL.
 * 2. Cada evento se procesa una vez. Stripe reenvía si no recibe un 200, y
 *    aplicar dos veces el mismo cambio no debe alterar el resultado.
 * 3. Los errores propios devuelven 500 para que Stripe reintente. Los eventos
 *    que no nos interesan devuelven 200 para que deje de mandarlos.
 */

/** El proxy excluye esta ruta: aquí no hay sesión, hay firma. */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Eventos que Planora sabe manejar. El resto se confirman y se ignoran. */
const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // El cuerpo crudo, sin parsear: la firma se calcula sobre estos bytes.
    const payload = await request.text();
    const stripe = getStripe();

    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      requireServerEnv('STRIPE_WEBHOOK_SECRET'),
    );
  } catch (error) {
    // Ni el motivo ni el cuerpo se devuelven: quien llama no es de fiar.
    logger.warn('Webhook de Stripe con firma inválida', {
      message: error instanceof Error ? error.message : 'desconocido',
    });
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    // 200 para que Stripe no lo reintente: no es un fallo, no nos interesa.
    return NextResponse.json({ received: true, handled: false });
  }

  const isNew = await markEventProcessed(event.id, event.type);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    // 500 para que Stripe reintente: es un problema nuestro, no suyo.
    logger.error('Fallo procesando un evento de Stripe', {
      type: event.type,
      message: error instanceof Error ? error.message : 'desconocido',
    });
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription' || !session.subscription) return;

      // Se relee la suscripción de Stripe en lugar de fiarse de la sesión:
      // así el estado guardado es siempre el real y completo.
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // La sesión sí sabe qué usuario inició el pago: se propaga.
      const userId = session.metadata?.user_id;
      if (userId && !subscription.metadata?.user_id) {
        subscription.metadata = { ...subscription.metadata, user_id: userId };
      }

      await syncSubscription(subscription);
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncSubscription(event.data.object);
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const parent = invoice.parent;
      const subscriptionRef =
        parent?.type === 'subscription_details'
          ? parent.subscription_details?.subscription
          : null;

      if (!subscriptionRef) return;

      const subscriptionId =
        typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id;

      // Se relee para que el estado (past_due, unpaid…) lo diga Stripe.
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
      return;
    }

    default:
      return;
  }
}
