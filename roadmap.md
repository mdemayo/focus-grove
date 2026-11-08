# Steady UI improvements
- [x] Conversation history selection and collapsible navigation
- [x] Expanded project chat with return navigation and retained state
- [x] Clear task actions and accessible chat input
- [x] Carousel completion states and readable project cards
- [x] Desktop/mobile navigation and conversation-preservation checks using browser-only fixtures; six tests passed

## Low-effort actions and linked goals
- [x] Shared confirmed actions, structured alternatives, and retained assistant messages
- [x] Dashboard action carousel, stable deadline ordering, switching cue and urgent notice
- [x] Structured timing creation and editing with local-date comparisons
- [x] Workspace and expanded-chat quick actions
- [x] Shared goals, project links, saved milestone proposals and explicit acceptance
- [x] Structured ADK context, safe retries, backward-compatible persistence
- [x] Focused state/deadline/backend tests and desktop/mobile interaction checks: 26 frontend tests, 8 isolated Python tool tests; browser UI and simulated ADK-contract flows passed
- [ ] Verify live agent generation, callback compatibility, timing clarification and milestone proposals — blocked by unavailable local ADK service and missing Google ADK runtime in this sandbox

Live-agent verification requires restarting the user's local ADK server with the updated Python agent and tools. No simulated responses are included in application code. Browser checks use temporary fixtures only. Goal creation and project linking are available; first milestones use the existing Assistant with explicit parent-goal selection. Milestone editing currently adjusts its title before approval.