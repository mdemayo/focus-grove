"""State-contract tests; a lightweight ToolContext stub avoids needing a live ADK server."""
import asyncio
import importlib.util
from pathlib import Path
import sys
import types
import unittest

stub = types.ModuleType("google.adk.tools")
stub.ToolContext = object
sys.modules.setdefault("google", types.ModuleType("google"))
sys.modules.setdefault("google.adk", types.ModuleType("google.adk"))
sys.modules.setdefault("google.adk.tools", stub)
spec = importlib.util.spec_from_file_location("steady_tools", Path(__file__).parent / "my_agent" / "tools.py")
tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tools)

class Context:
    def __init__(self):
        self.state = {}

class ToolsTests(unittest.TestCase):
    def setUp(self):
        self.ctx = Context()
        tools.break_down_task("Read paper", ["Open paper", "Write notes"], self.ctx)

    def authorize(self, **extra):
        self.ctx.state["steady_request"] = {"intent": "complete", "confirmed": True, "expected_step": 0, "operation_id": "op", "completion_scope": "step", **extra}

    def test_explicit_confirmation_required(self):
        tools.complete_step(self.ctx)
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [])

    def test_duplicate_completion_cannot_advance_twice(self):
        self.authorize()
        tools.complete_step(self.ctx)
        tools.complete_step(self.ctx)
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [0])

    def test_starter_cannot_complete_underlying_step_even_after_ack_in_same_request(self):
        self.ctx.state["steady_request"] = {"intent": "alternative", "expected_step": 0, "operation_id": "alt"}
        tools.set_alternative("Open the folder", "starter", self.ctx)
        self.authorize(alternative_id="alt", completion_scope="starter")
        tools.acknowledge_start(self.ctx)
        tools.complete_step(self.ctx)
        self.assertTrue(self.ctx.state["task_plan"]["alternative"]["acknowledged"])
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [])

    def test_equivalent_completion_clears_alternative(self):
        self.ctx.state["steady_request"] = {"intent": "alternative", "expected_step": 0, "operation_id": "alt"}
        tools.set_alternative("Listen to paper", "equivalent", self.ctx)
        self.authorize()
        tools.complete_step(self.ctx)
        self.assertIsNone(self.ctx.state["task_plan"]["alternative"])
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [0])

    def test_acceptance_and_timing_never_advance(self):
        tools.accept_action(self.ctx)
        tools.save_project_timing("personal", "2026-11-08", "", self.ctx)
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [])
        self.assertEqual(self.ctx.state["task_plan"]["timing"], {"kind": "personal", "date": "2026-11-08"})

    def test_invalid_deadline_type_is_not_assumed(self):
        self.assertEqual(tools.save_project_timing("", "2026-11-08", "", self.ctx)["status"], "error")
        self.assertNotIn("timing", self.ctx.state["task_plan"])

    def test_proposal_does_not_create_plan_or_change_progress(self):
        self.ctx.state["steady_request"] = {"goal": {"title": "Learn research"}}
        tools.propose_milestone("Compare methods", ["Find a method", "Compare"], "Build understanding", "Read paper", self.ctx)
        self.assertEqual(self.ctx.state["task_plan"]["goal"], "Read paper")
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [])

    def test_ordinary_chat_clears_stale_completion_authorization(self):
        self.authorize()
        self.ctx.user_content = types.SimpleNamespace(parts=[types.SimpleNamespace(text="Yes, that sounds interesting")])
        asyncio.run(tools.capture_steady_request(self.ctx, None))
        tools.complete_step(self.ctx)
        self.assertEqual(self.ctx.state["task_plan"]["completed_steps"], [])

if __name__ == "__main__":
    unittest.main()