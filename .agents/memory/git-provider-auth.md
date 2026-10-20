---
name: Git provider authentication
description: Native GitHub authorization can disagree with generic integration status and reconnect tooling.
---

Treat a live Git authentication failure as authoritative even when the native GitHub connection reports healthy or active. A native source-control connection is not always compatible with generic integration connection forms.

**Why:** Git rejected authentication while connection-status tools reported healthy. Both the reconnect form and the ordinary connection form rejected the native connection identifier.

**How to apply:** Do not extract or manually handle tokens. Consult current Replit documentation; when the native connection forms reject the provider, have the user reconnect GitHub through account settings under Git Providers. Rediscover the connection afterward: reconnecting can replace its identifier, so the former identifier may no longer resolve. A newly active connection does not itself prove workspace Git authentication is repaired; verify the live remote before changing repository history. If the new connection is active but Git still rejects authentication, report the mismatch rather than repeatedly requesting the same reconnection.

The Git pane can successfully fetch while agent-run Git commands still time out. Do not request further account reconnections when the pane has demonstrated working access.

**Why:** A user-triggered Git-pane refresh updated the fetch timestamp and remote-tracking history, while agent-run push still timed out.

**How to apply:** Use a fresh Git-pane fetch to inspect actual incoming history. After a safe local reconciliation, ask the user to push through the working pane if command-line access remains blocked. Completion still requires a confirmed push and a fresh comparison of the remote-tracking tip against the intended local commit.
