import { useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validTiming, type Timing } from "@/lib/task-details";

export function TimingEditor({ value, onSave, label = "Timing" }: { value?: Timing; onSave: (timing: Timing) => void; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(value && value.kind !== "none" ? value.date : "");
  const [time, setTime] = useState(value && value.kind !== "none" ? value.time ?? "" : "");
  const [kind, setKind] = useState<"fixed" | "personal" | "">(value && value.kind !== "none" ? value.kind : "");
  const [error, setError] = useState("");
  function save() {
    const timing = { kind, date, ...(time ? { time } : {}) };
    if (!validTiming(timing)) { setError(date ? "Is this a fixed deadline or your personal target?" : "Choose a date or No deadline."); return; }
    onSave(timing); setOpen(false); setError("");
  }
  return <div className="text-sm">
    <Button variant="ghost" onClick={() => { setDate(value && value.kind !== "none" ? value.date : ""); setTime(value && value.kind !== "none" ? value.time ?? "" : ""); setKind(value && value.kind !== "none" ? value.kind : ""); setOpen(!open); }} aria-expanded={open} className="h-11 px-2"><CalendarDays aria-hidden />{label}</Button>
    {open && <fieldset className="space-y-3 border-y border-border py-4">
      <legend className="sr-only">Project timing</legend>
      <div className="flex flex-wrap gap-3"><label htmlFor={`${id}-date`} className="flex min-w-0 flex-col gap-1">Date<input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 min-w-0 rounded-md border border-input bg-background px-2" /></label><label htmlFor={`${id}-time`} className="flex flex-col gap-1">Time (optional)<input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-md border border-input bg-background px-2" /></label></div>
      {!time && <p className="text-xs text-muted-foreground">No specific time</p>}
      {date && <div className="flex flex-wrap gap-2"><Button variant={kind === "fixed" ? "default" : "outline"} aria-pressed={kind === "fixed"} onClick={() => setKind("fixed")}>Fixed deadline</Button><Button variant={kind === "personal" ? "default" : "outline"} aria-pressed={kind === "personal"} onClick={() => setKind("personal")}>Personal target</Button></div>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex gap-2"><Button onClick={save}>Save timing</Button><Button variant="outline" onClick={() => { onSave({ kind: "none" }); setDate(""); setTime(""); setKind(""); setOpen(false); setError(""); }}>No deadline</Button></div>
    </fieldset>}
  </div>;
}