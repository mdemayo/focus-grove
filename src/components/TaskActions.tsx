import { useState } from "react";
import { Check, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTasks } from "@/lib/task-context";
import { currentStep, type Task } from "@/lib/mock-data";

export function TaskActions({ task, onHelp }: { task: Task; onHelp?: () => void }) {
  const { runAction, pending, errors } = useTasks();
  const [confirm, setConfirm] = useState(false);
  const busy = !!pending[task.id];
  const starter = task.activeAlternative?.kind === "starter" && !task.activeAlternative.acknowledged;
  if (!currentStep(task)) return null;
  return <div>
    {task.activeAlternative && !task.activeAlternative.acknowledged && <p className="mb-3 text-xs text-muted-foreground">{starter ? "A smaller start · the full step stays open" : "Alternative · satisfies the same step"}</p>}
    {task.activeAlternative?.acknowledged && <p className="mb-3 text-xs text-muted-foreground">Starting action recorded. Continue with the same step.</p>}
    <div className="flex flex-wrap gap-2">
      {task.actionState === "proposed" ? <Button disabled={busy} onClick={() => void runAction(task.id, "accept-action")}>Start here</Button> : <Button disabled={busy} onClick={() => setConfirm(true)} className="h-11"><Check aria-hidden />{busy ? "Confirming…" : "Done"}</Button>}
      <Button variant="outline" disabled={busy} onClick={() => void runAction(task.id, "alternative")} className="h-11 bg-card"><RefreshCw aria-hidden />Try another way</Button>
      {onHelp && <Button variant="ghost" disabled={busy} onClick={onHelp} className="h-11"><MessageCircle aria-hidden />I need help</Button>}
    </div>
    {errors[task.id] && <p role="alert" className="mt-3 text-sm text-destructive">{errors[task.id]}</p>}
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md"><DialogTitle>{starter ? "Finished this smaller start?" : "Finished the current step?"}</DialogTitle><DialogDescription>{starter ? "This records your starting action without completing the larger step." : "Progress changes only after the assistant confirms this step."}</DialogDescription><p className="text-sm">{starter ? task.activeAlternative?.text : currentStep(task)?.title}</p><div className="flex gap-2"><Button disabled={busy} onClick={async () => { setConfirm(false); await runAction(task.id, "complete"); }}>{starter ? "Confirm starting action" : "Confirm done"}</Button><Button variant="outline" onClick={() => setConfirm(false)}>Not yet</Button></div></DialogContent></Dialog>
  </div>;
}