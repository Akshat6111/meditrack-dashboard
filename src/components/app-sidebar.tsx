import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  Pill,
  CalendarClock,
  ClipboardList,
  Bell,
  Settings,
  FileHeart,
  BarChart3,
  Users,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: User },
  { to: "/medications", label: "Medications", icon: Pill },
  { to: "/schedule", label: "Schedule", icon: CalendarClock },
  { to: "/adherence-log", label: "Adherence Log", icon: ClipboardList },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const disabled = [
  { label: "Health Records", icon: FileHeart },
  { label: "Reports", icon: BarChart3 },
  { label: "Caregivers", icon: Users },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold tracking-tight">MediSync</div>
          <div className="text-[11px] text-muted-foreground -mt-0.5">Personal health</div>
        </div>
      </div>

      <nav className="px-3 py-4 flex-1 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-sidebar-border/70">
          <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Coming soon
          </div>
          {disabled.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground/60 cursor-not-allowed"
              aria-disabled="true"
            >
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
              <span>{label}</span>
              <span className="ml-auto text-[10px] rounded-full bg-muted px-2 py-0.5">Soon</span>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
