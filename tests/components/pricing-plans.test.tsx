import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PricingPlans } from '@/components/landing/pricing-plans';
import { getPlanPrice, monthlyEquivalent } from '@/config/pricing';

/** Normaliza el espacio duro que usa Intl.NumberFormat antes del símbolo €. */
const plain = (value: string) => value.replace(/ /g, ' ');

describe('<PricingPlans />', () => {
  it('muestra los dos planes', () => {
    render(<PricingPlans />);
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
  });

  it('arranca en facturación mensual con el precio de la configuración', () => {
    render(<PricingPlans />);
    const monthly = getPlanPrice('pro', 'month');
    expect(monthly).toBeDefined();
    const rendered = screen.getByText((content) => plain(content).startsWith('7,99'));
    expect(rendered).toBeInTheDocument();
  });

  it('al cambiar a anual muestra el equivalente mensual y el total del año', async () => {
    const user = userEvent.setup();
    render(<PricingPlans />);

    await user.click(screen.getByRole('radio', { name: /Anual/ }));

    const yearly = getPlanPrice('pro', 'year');
    expect(yearly).toBeDefined();
    const perMonth = (monthlyEquivalent(yearly!.amountCents) / 100).toFixed(2).replace('.', ',');

    expect(screen.getByText((content) => plain(content).startsWith(perMonth))).toBeInTheDocument();
    expect(screen.getByText(/facturado de una vez/)).toBeInTheDocument();
  });

  it('el plan gratuito no muestra precio mensual de pago', () => {
    render(<PricingPlans />);
    expect(screen.getByText('para siempre')).toBeInTheDocument();
  });

  it('cada plan lleva a donde toca', () => {
    render(<PricingPlans />);
    // El gratuito, a crear cuenta. El de pago, a la mejora dentro de la app,
    // que es donde se abre el checkout de Stripe.
    expect(screen.getByRole('link', { name: /Empezar gratis/ })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.getByRole('link', { name: /Desbloquear Pro/ })).toHaveAttribute(
      'href',
      '/upgrade',
    );
  });

  it('acepta destinos personalizados', () => {
    render(<PricingPlans freeHref="/a" proHref="/b" />);
    expect(screen.getByRole('link', { name: /Empezar gratis/ })).toHaveAttribute('href', '/a');
    expect(screen.getByRole('link', { name: /Desbloquear Pro/ })).toHaveAttribute('href', '/b');
  });
});
