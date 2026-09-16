import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: { text: string; linkLabel: string; href: string };
}) {
  return (
    <Card className="shadow-lg shadow-black/[0.04]">
      <CardHeader className="pb-4 text-center">
        <CardTitle className="font-display text-2xl">{title}</CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pb-6">
        {children}
        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer.text}{' '}
            <Link href={footer.href} className="font-medium text-primary hover:underline">
              {footer.linkLabel}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
