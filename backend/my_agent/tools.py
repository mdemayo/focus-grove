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
    
    existing = tool_context.state.get("task_plan")
    if existing:
        return {"status": "existing_plan", "plan": existing}
    tool_context.state["task_plan"] = {
        "action_state": "accepted",
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

    request = tool_context.state.get("steady_request", {})
    operation = request.get("operation_id")
    current = plan["current_step"]
    if operation and plan.get("action_receipt") == operation:
        return {"status": "already_confirmed"}
    if request.get("intent") != "complete" or not request.get("confirmed") or request.get("expected_step") != current:
        return {"status": "error", "message": "Explicit confirmation for this step is required. Use Done."}
    alternative = plan.get("alternative")
    if alternative and alternative["kind"] == "starter" and not alternative.get("acknowledged"):
        return {"status": "error", "message": "Acknowledge the starting action; do not complete the whole step."}
    steps = plan["steps"]

    if current >= len(steps):
        return {
            "status": "already_completed",
            "message": "All steps are already completed."
        }

    updated_plan = {
        **plan,
        "completed_steps": plan["completed_steps"] + [current],
        "current_step": current + 1,
        "alternative": None,
        "action_receipt": operation
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



def set_alternative(text: str, kind: str, tool_context: ToolContext) -> dict:
    """Save one alternative for the current step: equivalent or starter. Never change the plan."""
    plan = tool_context.state.get("task_plan")
    if not plan or kind not in ("starter", "equivalent") or not text.strip():
        return {"status": "error"}
    request = tool_context.state.get("steady_request", {})
    current = plan["current_step"]
    if request.get("intent") != "alternative" or request.get("expected_step") != current:
        return {"status": "error", "message": "No matching alternative request."}
    alternative = {"id": request["operation_id"], "step_index": current, "text": text.strip(), "kind": kind, "acknowledged": False}
    tool_context.state["task_plan"] = {**plan, "alternative": alternative}
    return {"status": "success", "alternative": alternative}


def acknowledge_start(tool_context: ToolContext) -> dict:
    """Acknowledge a completed smaller starting action without completing its underlying step."""
    plan = tool_context.state.get("task_plan", {})
    alt = plan.get("alternative")
    request = tool_context.state.get("steady_request", {})
    if not alt or alt["kind"] != "starter" or request.get("intent") != "complete" or request.get("alternative_id") != alt["id"]:
        return {"status": "error"}
    tool_context.state["task_plan"] = {**plan, "alternative": {**alt, "acknowledged": True}}
    return {"status": "success", "message": "Starting action recorded; underlying step stays active."}


def accept_action(tool_context: ToolContext) -> dict:
    """Accept a proposed action without completing it."""
    plan = tool_context.state.get("task_plan")
    if not plan:
        return {"status": "error"}
    tool_context.state["task_plan"] = {**plan, "action_state": "accepted"}
    return {"status": "accepted"}


def save_project_timing(kind: str, date: str, time: str, tool_context: ToolContext) -> dict:
    """Save explicitly agreed project timing. kind: none/fixed/personal; blank time means no specific time. Clarify ambiguous type/date before calling."""
    from datetime import date as calendar_date, time as clock_time
    if kind not in ("none", "fixed", "personal"):
        return {"status": "error", "message": "Clarify fixed deadline or personal target."}
    timing = {"kind": kind}
    if kind != "none":
        try:
            calendar_date.fromisoformat(date)
            if time:
                clock_time.fromisoformat(time)
        except ValueError:
            return {"status": "error", "message": "Use a clear calendar date and optional local time."}
        timing["date"] = date
        if time:
            timing["time"] = time
    plan = tool_context.state.get("task_plan")
    if not plan:
        return {"status": "error", "message": "No project yet."}
    tool_context.state["task_plan"] = {**plan, "timing": timing}
    return {"status": "success", "timing": timing}


def propose_milestone(title: str, steps: list[str], reason: str, contribution: str, tool_context: ToolContext) -> dict:
    """Save ONE next milestone proposal without creating a project; contribution uses only recorded facts."""
    import uuid
    plan = tool_context.state.get("task_plan")
    context = tool_context.state.get("steady_request", {})
    if not plan or not context.get("goal") or not 2 <= len(steps) <= 5 or not title.strip():
        return {"status": "error"}
    existing = plan.get("milestone_proposal")
    proposal = {"id": existing["id"] if existing else str(uuid.uuid4()), "title": title.strip(), "steps": steps, "reason": reason, "contribution": contribution}
    tool_context.state["task_plan"] = {**plan, "milestone_proposal": proposal}
    return {"status": "proposal", "proposal": proposal}


async def capture_steady_request(callback_context, llm_request):
    """Capture the app's structured action envelope before model execution; ordinary chat clears old authorization."""
    import json
    content = callback_context.user_content
    request = {}
    if content and content.parts:
        for part in content.parts:
            if not part.text:
                continue
            try:
                payload = json.loads(part.text)
                if isinstance(payload, dict) and isinstance(payload.get("steady_request"), dict):
                    request = payload["steady_request"]
            except (ValueError, TypeError):
                pass
    callback_context.state["steady_request"] = request
    plan = callback_context.state.get("task_plan")
    if plan and isinstance(request.get("project", {}).get("timing"), dict):
        callback_context.state["task_plan"] = {**plan, "timing": request["project"]["timing"]}
