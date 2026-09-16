import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="mb-1">
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="success" className="mb-1">
      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
