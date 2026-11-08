from google.adk.tools import ToolContext

def break_down_task(
    task: str,
    steps: list[str],
    tool_context: ToolContext
) -> dict:
    """
    Break down a large task into small, actionable steps.

    Args:
        task: The original task the student wants to complete.
        steps: A list of small, concrete actions proposed
            by the AI, ordered from first to last.

    Returns:
        A structured breakdown of the task.
    """

    if not task.strip():
        return {"status": "error", "message": "Task cannot be empty."}

    clean_steps = [step.strip() for step in steps if step.strip()]

    if not 2 <= len(clean_steps) <= 5:
        return {
            "status": "error",
            "message": "Provide between 2 and 5 small steps."
        }
    
    tool_context.state["task_plan"] = {
        "goal": task,
        "steps": clean_steps,
        "current_step": 0,
        "completed_steps": [],
        "status": "in_progress"
        }
    
    return {
        "status": "success",
        "original_task": task,
        "total_steps": len(clean_steps),
        "steps": clean_steps,
        "first_action": clean_steps[0]
    }

def complete_step(tool_context: ToolContext) -> dict:
    """
    Mark the current task step as completed after
    the student explicitly confirms finishing it.

    Returns:
        Updated progress and the next step, if any.
    """

    plan = tool_context.state.get("task_plan")

    if not plan:
        return {
            "status": "error",
            "message": "No active task plan found."
        }

    steps = plan["steps"]
    current = plan["current_step"]

    if current >= len(steps):
        return {
            "status": "already_completed",
            "message": "All steps are already completed."
        }

    updated_plan = {
        **plan,
        "completed_steps": plan["completed_steps"] + [current],
        "current_step": current + 1
    }

    if updated_plan["current_step"] >= len(steps):
        updated_plan["status"] = "completed"
        next_step = None
    else:
        next_step = steps[updated_plan["current_step"]]

    tool_context.state["task_plan"] = updated_plan

    return {
        "status": updated_plan["status"],
        "completed": len(updated_plan["completed_steps"]),
        "total": len(steps),
        "next_step": next_step
    }

