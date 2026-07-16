import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pill, Plus, Trash2 } from "lucide-react";
import { api, ApiError, type Medication, type MedicationCreate } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/medications")({
  component: MedicationsPage,
});

const empty: MedicationCreate = {
  name: "",
  dosage_amount: 1,
  dosage_unit: "mg",
  frequency_per_day: 1,
  duration_days: 7,
  route: "oral",
  with_food: false,
  empty_stomach: false,
  bedtime_only: false,
  start_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

function MedicationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MedicationCreate>(empty);

  const q = useQuery({
    queryKey: ["medications"],
    queryFn: () => api.get<Medication[]>("/medications/"),
    retry: false,
  });

  const add = useMutation({
    mutationFn: (body: MedicationCreate) => api.post<Medication>("/medications/", body),
    onSuccess: () => {
      toast.success("Medication added");
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to add"),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/medications/${id}`),
    onSuccess: () => {
      toast.success("Medication removed");
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to remove"),
  });

  return (
    <div>
      <PageHeader
        title="Medications"
        description="Everything you take, on a single clean list."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><Plus className="h-4 w-4 mr-1.5" /> Add medication</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Add a medication</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); add.mutate(form); }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <F label="Name" full>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </F>
                <F label="Dosage amount">
                  <Input type="number" min={1} required value={form.dosage_amount} onChange={(e) => setForm({ ...form, dosage_amount: Number(e.target.value) })} />
                </F>
                <F label="Dosage unit">
                  <Input required value={form.dosage_unit} onChange={(e) => setForm({ ...form, dosage_unit: e.target.value })} placeholder="mg, ml, tablet" />
                </F>
                <F label="Frequency per day">
                  <Input type="number" min={1} required value={form.frequency_per_day} onChange={(e) => setForm({ ...form, frequency_per_day: Number(e.target.value) })} />
                </F>
                <F label="Duration (days)">
                  <Input type="number" min={1} required value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
                </F>
                <F label="Route">
                  <Input required value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="oral, topical…" />
                </F>
                <F label="Start date">
                  <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </F>
                <div className="md:col-span-2 flex flex-wrap gap-4 pt-1">
                  <CheckField checked={form.with_food} onChange={(v) => setForm({ ...form, with_food: v })} label="Take with food" />
                  <CheckField checked={form.empty_stomach} onChange={(v) => setForm({ ...form, empty_stomach: v })} label="Empty stomach" />
                  <CheckField checked={form.bedtime_only} onChange={(v) => setForm({ ...form, bedtime_only: v })} label="Bedtime only" />
                </div>
                <F label="Notes" full>
                  <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </F>
                <DialogFooter className="md:col-span-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="rounded-full" disabled={add.isPending}>
                    {add.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {q.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medications yet"
          description="Add your first medication to start tracking doses and adherence."
          action={<Button className="rounded-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add medication</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {q.data.map((m) => (
            <Card key={m.id} className="rounded-2xl p-5 flex items-start gap-4">
              <div className="h-11 w-11 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                <Pill className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{m.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {m.dosage_amount} {m.dosage_unit} · {m.frequency_per_day}× / day · {m.route}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {m.with_food && <Badge variant="secondary">With food</Badge>}
                  {m.empty_stomach && <Badge variant="secondary">Empty stomach</Badge>}
                  {m.bedtime_only && <Badge variant="secondary">Bedtime only</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {m.start_date} → {m.end_date}
                </div>
                {m.notes && <p className="text-sm text-muted-foreground mt-2">{m.notes}</p>}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {m.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This can't be undone. Adherence history for this medication will remain.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(m.id)}>Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CheckField({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      {label}
    </label>
  );
}
