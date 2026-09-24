"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Image as ImageIcon,
  CalendarDays,
  Palette,
  HardDrive,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/client-store";
import { buildAutoTasks } from "@/lib/tasks";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Logo from "./Logo";

type NavLink = { label: string; href: string; icon: React.ElementType; badge?: "ideas" | "ready" | "todo" };
type NavItem = NavLink | { separator: string };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Da fare", href: "/da-fare", icon: ListTodo, badge: "todo" },
  { separator: "Banca" },
  { label: "Idee grezze", href: "/idee", icon: Lightbulb, badge: "ideas" },
  { label: "Contenuti", href: "/contenuti", icon: FileText, badge: "ready" },
  { label: "Immagini", href: "/immagini", icon: ImageIcon },
  { separator: "Produzione" },
  { label: "Piano editoriale", href: "/piano", icon: CalendarDays },
  { label: "Editor grafiche", href: "/editor", icon: Palette },
  { separator: "Sistema" },
  { label: "Backup e dati", href: "/backup", icon: HardDrive },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export default function AppSidebar({ collapsed, onToggle, onNavigate }: Props) {
  const pathname = usePathname();
  const ideasCount = useStore((s) => s.ideas.filter((i) => i.status === "grezza").length);
  const readyCount = useStore((s) => s.posts.filter((p) => p.status === "pronto").length);
  const posts = useStore((s) => s.posts);
  const openTodos = useStore((s) => s.todos.filter((t) => !t.done).length);
  const settings = useSettings();
  const todoCount = buildAutoTasks(posts, settings).length + openTodos;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <Link href="/" onClick={onNavigate} className={cn(collapsed && "mx-auto")}>
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            if ("separator" in item) {
              if (collapsed) return <li key={index} className="my-3 border-t border-border" />;
              return (
                <li key={index} className="px-3 pb-1 pt-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.separator}
                  </span>
                </li>
              );
            }

            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            const badgeCount = item.badge === "ideas" ? ideasCount : item.badge === "ready" ? readyCount : item.badge === "todo" ? todoCount : 0;

            const linkContent = (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <span className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {collapsed && badgeCount > 0 && (
                    <span className={cn("absolute -right-1 -top-1 h-2 w-2 rounded-full", item.badge === "todo" ? "bg-red-500" : "bg-primary")} />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {badgeCount > 0 && (
                      <span
                        className={cn(
                          "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none text-white",
                          item.badge === "todo" ? "bg-red-500" : "bg-primary",
                        )}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <li key={item.href}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }
            return <li key={item.href}>{linkContent}</li>;
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-border px-2 py-2">
        <a
          href="https://www.linkedin.com/feed/"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10",
            collapsed && "justify-center px-2",
          )}
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Apri LinkedIn</span>}
        </a>
      </div>

      <div className="shrink-0 border-t border-border p-2">
        <Button variant="ghost" size="sm" onClick={onToggle} className="w-full justify-center">
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span className="text-xs">Comprimi</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
