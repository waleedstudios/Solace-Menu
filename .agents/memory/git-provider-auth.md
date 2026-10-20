---
name: Git provider authentication
description: Native GitHub authorization can disagree with generic integration status and reconnect tooling.
---

Treat a live Git authentication failure as authoritative even when the native GitHub connection reports healthy or active. A native source-control connection is not always compatible with generic integration connection forms.

**Why:** Git rejected authentication while connection-status tools reported healthy. Both the reconnect form and the ordinary connection form rejected the native connection identifier.

**How to apply:** Do not extract or manually handle tokens. Consult current Replit documentation; when the native connection forms reject the provider, have the user reconnect GitHub through account settings under Git Providers, then retry the live remote check before changing repository history.
