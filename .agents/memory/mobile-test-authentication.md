---
name: Mobile test authentication
description: Scope and limits of browser test sessions for the separate Expo preview
---

Do not assume the browser tester's programmatic Clerk sign-in on the shared website host also signs into the separate Expo preview origin.

**Why:** The supported sign-in helper redirected to the shared host during invoice verification. The Expo preview remained signed out, so the signed-in website could verify the shared backend but not the native review screen.

**How to apply:** Check the Expo preview's actual signed-in state before counting a mobile browser test as native UI verification. Use a supported origin-specific sign-in or real-device session; never weaken authentication to make the test pass. Report website fallback evidence separately from native-device evidence.
