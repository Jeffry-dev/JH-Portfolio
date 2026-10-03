import {
  AppWindow,
  Bot,
  Braces,
  ChartCandlestick,
  CodeXml,
  Database,
  GitBranch,
  KeyRound,
  Layers,
  MessageSquareText,
  Monitor,
  Network,
  Receipt,
  Server,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/types";

const icons: Record<IconName, LucideIcon> = {
  server: Server,
  "server-cog": ServerCog,
  network: Network,
  database: Database,
  code: CodeXml,
  braces: Braces,
  bot: Bot,
  sparkles: Sparkles,
  shield: ShieldCheck,
  key: KeyRound,
  monitor: Monitor,
  "app-window": AppWindow,
  layers: Layers,
  terminal: Terminal,
  git: GitBranch,
  wrench: Wrench,
  chart: ChartCandlestick,
  users: Users,
  receipt: Receipt,
  utensils: UtensilsCrossed,
  message: MessageSquareText,
};

interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

/** Decorative icon resolved by name. Always hidden from assistive tech. */
export function Icon({ name, className, strokeWidth = 1.6 }: IconProps) {
  const Component = icons[name];
  return <Component aria-hidden="true" focusable="false" className={className} strokeWidth={strokeWidth} />;
}
