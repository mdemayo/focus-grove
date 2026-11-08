import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { Route as TaskRoute } from "@/routes/tasks.$taskId";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("expands and collapses the same task route without changing the session ID", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const workspace = router.matchRoutes("/tasks/task_existing");
    const chat = router.matchRoutes("/tasks/task_existing?chat=true");
    expect(workspace.at(-1)?.routeId).toBe("/tasks/$taskId");
    expect(chat.at(-1)?.routeId).toBe("/tasks/$taskId");
    expect(chat.at(-1)?.params).toEqual({ taskId: "task_existing" });
    expect(workspace.at(-1)?.params).toEqual({ taskId: "task_existing" });
  });

  it("only enables expanded chat for an explicit true option", () => {
    const validate = TaskRoute.options.validateSearch;
    if (typeof validate !== "function") throw new Error("Missing chat search validator");
    expect(validate({ chat: true })).toEqual({ chat: true });
    expect(validate({ chat: "true" })).toEqual({ chat: true });
    expect(validate({ chat: "false" })).toEqual({});
    expect(validate({})).toEqual({});
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
