import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/lib/task-context";
import { currentStep, type Task } from "@/lib/mock-data";

export function ProjectGoalEditor({ task }: { task: Task }) {
  const { goals, linkGoal, createGoal } = useTasks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [contribution, setContribution] = useState(task.contribution ?? "");
  return <div className="text-sm"><Button variant="ghost" className="h-11 px-2" onClick={() => setOpen(!open)} aria-expanded={open}><Flag aria-hidden />{task.goalId ? "Edit goal connection" : "Link a goal"}</Button>{open && <div className="space-y-3 border-y border-border py-3"><label className="flex flex-col gap-1">Parent goal<select aria-label="Parent goal" value={task.goalId ?? ""} onChange={(e) => linkGoal(task.id, e.target.value || undefined, contribution)} className="h-11 max-w-full rounded-md border border-input bg-background px-2"><option value="">Independent project</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label className="flex flex-col gap-1">How this project contributes<input value={contribution} onChange={(e) => setContribution(e.target.value)} className="h-11 rounded-md border border-input bg-background px-2" /></label><Button onClick={() => { linkGoal(task.id, task.goalId, contribution); setOpen(false); }}>Save connection</Button><label className="flex flex-col gap-1">New long-term goal<input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-md border border-input bg-background px-2" /></label><Button variant="outline" disabled={!title.trim()} onClick={() => { const id = createGoal(title); linkGoal(task.id, id, contribution); setTitle(""); setOpen(false); }}><Plus aria-hidden />Create and link goal</Button></div>}</div>;
}

export function GoalOverview() {
  const { goals, tasks, createGoal, runAction, acceptMilestone, updateProposal, pending, errors } = useTasks();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState("");
  return <section className="mt-8 border-t border-border py-6" aria-labelledby="goals-heading"><div className="flex items-center justify-between gap-3"><h2 id="goals-heading" className="text-lg font-medium">Long-term goals</h2><Button variant="ghost" onClick={() => setCreating(!creating)}><Plus aria-hidden />New goal</Button></div>{creating && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { createGoal(title); setTitle(""); setCreating(false); } }}><input aria-label="Long-term goal" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3" placeholder="Your long-term goal" /><Button disabled={!title.trim()}>Create goal</Button></form>}
    <div className="mt-4 space-y-6">{goals.map((goal) => {
      const projects = tasks.filter((task) => task.goalId === goal.id);
      const finished = projects.filter((task) => !currentStep(task));
      const active = projects.filter((task) => currentStep(task));
      const source = finished.at(-1);
      const proposal = goal.proposal;
      return <div key={goal.id} className="border-b border-border pb-5"><h3 className="flex items-center gap-2 font-medium"><Flag className="h-4 w-4 text-primary" aria-hidden />{goal.title}</h3><p className="mt-1 text-xs text-muted-foreground">{active.length} active · {finished.length} completed projects</p><ul className="mt-3 space-y-2">{projects.map((task) => <li key={task.id}><Link to="/tasks/$taskId" params={{ taskId: task.id }} className="text-sm underline underline-offset-4">{task.title}</Link><span className="ml-2 text-xs text-muted-foreground">{currentStep(task) ? "Active" : "Completed"}</span>{task.outcome && <p className="mt-1 text-sm text-muted-foreground">{task.outcome}</p>}</li>)}</ul>{projects.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No linked projects yet.</p>}
        {!projects.length && <Button asChild variant="outline" className="mt-3"><Link to="/assistant">Propose first milestone</Link></Button>}
        {source && (!proposal || proposal.acceptedTaskId) && !active.length && <Button variant="outline" className="mt-3" disabled={pending[source.id]} onClick={() => void runAction(source.id, "propose-milestone")}>Choose next milestone</Button>}
        {proposal && !proposal.acceptedTaskId && <div className="mt-4 border-l-2 border-primary pl-4"><p className="text-xs text-muted-foreground">Suggested next milestone · not a commitment</p><h4 className="mt-2 font-medium">{proposal.title}</h4><p className="mt-1 text-sm text-muted-foreground">{proposal.reason}</p>{proposal.contribution && <p className="mt-2 text-sm">Recorded contribution: {proposal.contribution}</p>}
          {proposal.deferred ? <Button variant="outline" className="mt-3" onClick={() => updateProposal(goal.id, { deferred: false })}>Choose next milestone</Button> : <><div className="mt-3 flex flex-wrap gap-2"><Button disabled={pending[goal.id]} onClick={() => void acceptMilestone(goal.id)}>Accept milestone</Button><Button variant="outline" onClick={() => { setEditing(goal.id); setDraft(proposal.title); }}>Edit</Button><Button variant="ghost" onClick={() => updateProposal(goal.id, { deferred: true })}>Not now</Button></div>{active.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Accepting adds another project alongside your active milestone.</p>}</>}
          {editing === goal.id && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { updateProposal(goal.id, { title: draft.trim() }); setEditing(undefined); } }}><input aria-label="Milestone title" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-2" /><Button>Save suggestion</Button></form>}
        </div>}{(errors[goal.id] || (source && errors[source.id])) && <p role="alert" className="mt-2 text-sm text-destructive">{errors[goal.id] || (source && errors[source.id])}</p>}
      </div>;
    })}</div>
  </section>;
}