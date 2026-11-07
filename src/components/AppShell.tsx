import { Link } from "@tanstack/react-router";
import { LayoutDashboard, MessageCircle, Leaf } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Today", icon: LayoutDashboard },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded-md focus:bg-card focus:p-2">
        Skip to content
      </a>
      <aside className="border-b border-border bg-sidebar md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold">Steady</span>
        </div>
        <nav aria-label="Main" className="flex gap-1 px-3 pb-3 md:flex-col">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main id="main" className="flex-1">{children}</main>
    </div>
  );
}
