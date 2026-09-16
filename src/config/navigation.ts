import {
  BarChart3Icon,
  CalendarDaysIcon,
  FlameIcon,
  LayoutDashboardIcon,
  TimerIcon,
  type LucideIcon,
} from 'lucide-react';
import { routes } from './routes';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sección todavía en construcción: se marca en la interfaz. */
  upcoming?: boolean;
}

/** Navegación principal de la aplicación (sidebar y barra inferior). */
export const appNavItems: NavItem[] = [
  { href: routes.dashboard, label: 'Panel', icon: LayoutDashboardIcon },
  { href: routes.plan, label: 'Plan', icon: CalendarDaysIcon },
  { href: routes.focus, label: 'Focus', icon: TimerIcon, upcoming: true },
  { href: routes.habits, label: 'Hábitos', icon: FlameIcon, upcoming: true },
  { href: routes.progress, label: 'Progreso', icon: BarChart3Icon },
];
