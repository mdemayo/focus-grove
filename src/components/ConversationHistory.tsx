import { Link } from "@tanstack/react-router";
import { CheckCircle2, MessageCircle, Plus } from "lucide-react";
import { useTasks } from "@/lib/task-context";

type ConversationHistoryProps = {
  headingId: string;
  onNavigate?: () => void;
};

export function ConversationHistory({ headingId, onNavigate }: ConversationHistoryProps) {
  const { tasks } = useTasks();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-5 pb-4">
        <h2 id={headingId} className="font-display text-lg font-medium">
          Your conversations
        </h2>
        <Link
          to="/assistant"
          onClick={onNavigate}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New conversation
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium">No conversations yet</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Start a conversation and your projects will appear here.
          </p>
        </div>
      ) : (
        <nav aria-label="Conversation history" className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
          <ul className="space-y-1">
            {tasks.map((task) => {
              const completed = task.completedStepIds.length;
              const total = task.steps.length;
              const isComplete = total > 0 && completed === total;

              return (
                <li key={task.id}>
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    onClick={onNavigate}
                    className="block rounded-xl px-3 py-3 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <span className="flex items-start gap-2">
                      <span className="line-clamp-2 min-w-0 flex-1 font-medium leading-snug">
                        {task.title}
                      </span>
                      {isComplete && (
                        <span className="mt-0.5 shrink-0 text-primary">
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Completed</span>
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {completed}/{total} steps completed
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
