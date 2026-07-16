import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, CalendarClock, Loader2, Pill } from "lucide-react";
import { api, type AdherenceStats, type Medication, type Notification, type ScheduleResponse } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const { user } = useAuth();

  const meds = useQuery({ queryKey: ["medications"], queryFn: () => api.get<Medication[]>("/medications/"), retry: false });
  const adherence = useQuery({ queryKey: ["adherence"], queryFn: () => api.get<AdherenceStats>("/analytics/adherence"), retry: false });
  const schedule = useQuery({ queryKey: ["schedule"], queryFn: () => api.get<ScheduleResponse>("/schedule/me"), retry: false });
  const notif = useQuery({ queryKey: ["notifications"], queryFn: () => api.get<Notification[]>("/notifications/me"), retry: false });

  const medCount = meds.data?.length ?? 0;
  const rate = adherence.data ? Math.round(adherence.data.adherence_rate * 100) : 0;
  const dosesToday = schedule.data?.schedule?.length ?? 0;
  const unread = (notif.data ?? []).filter((n) => !n.is_read).length;

  const chartData = adherence.data
    ? [
        { name: "Taken", value: adherence.data.taken, fill: "var(--success)" },
        { name: "Missed", value: adherence.data.missed, fill: "var(--destructive)" },
        { name: "Late", value: adherence.data.late, fill: "var(--warning)" },
        { name: "Skipped", value: adherence.data.skipped, fill: "var(--muted-foreground)" },
      ]
    : [];

  const donut = [
    { name: "Adherence", value: rate, fill: "var(--primary)" },
    { name: "Rest", value: Math.max(0, 100 - rate), fill: "var(--muted)" },
  ];

  const upcoming = (schedule.data?.schedule ?? []).slice(0, 4);

  return (
    <div>
      <div className="rounded-2xl bg-hero-mint p-6 md:p-8 mb-6 border border-border/60">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greeting()}, {user?.full_name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your health today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Medications tracked" value={meds.isLoading ? "—" : medCount} icon={Pill} tint="teal" delta={medCount > 0 ? 4 : null} />
        <StatCard label="Adherence rate" value={adherence.isLoading ? "—" : rate} suffix="%" icon={Activity} tint="blue" delta={rate >= 80 ? 3 : -2} />
        <StatCard label="Doses today" value={schedule.isLoading ? "—" : dosesToday} icon={CalendarClock} tint="amber" delta={dosesToday > 0 ? 1 : null} />
        <StatCard label="Unread alerts" value={notif.isLoading ? "—" : unread} icon={Bell} tint="rose" delta={unread > 0 ? unread : null} />
      </div>

      {schedule.data?.conflict && (
        <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-warning/30 flex items-center justify-center text-warning-foreground">⚠️</div>
            <div>
              <div className="font-semibold">Possible medication conflict</div>
              <p className="text-sm text-muted-foreground mt-0.5">{schedule.data.conflict.reason}</p>
              {schedule.data.conflict.detail && (
                <p className="text-sm mt-1">{schedule.data.conflict.detail}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader>
            <CardTitle>Adherence breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {adherence.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Adherence rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} innerRadius={62} outerRadius={82} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                    {donut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{rate}%</span>
                <span className="text-xs text-muted-foreground">on time</span>
              </div>
            </div>
            {adherence.data && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-4 text-sm w-full">
                <div className="flex justify-between"><span className="text-muted-foreground">Taken</span><span className="font-medium">{adherence.data.taken}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Missed</span><span className="font-medium">{adherence.data.missed}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Late</span><span className="font-medium">{adherence.data.late}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Skipped</span><span className="font-medium">{adherence.data.skipped}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-2xl">
          <CardHeader>
            <CardTitle>Upcoming doses</CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming doses scheduled.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((s, i) => (
                  <li key={`${s.medication_id}-${s.dose_index}-${i}`} className="flex items-center gap-4 py-3">
                    <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.medication_name}</div>
                      <div className="text-xs text-muted-foreground">Dose #{s.dose_index + 1}</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{formatTime(s.scheduled_time)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  try {
    // API returns either an ISO datetime or an HH:MM string
    if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
    return format(parseISO(iso), "p");
  } catch {
    return iso;
  }
}
