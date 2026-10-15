---
name: Database timestamp precision
description: Avoid losing the precision needed by conditional database updates
---

When a PostgreSQL timestamp identifies an operation generation or guards a compare-and-set update, preserve its exact database representation rather than round-tripping it through a JavaScript Date.

**Why:** PostgreSQL timestamps can include microseconds, while JavaScript Dates retain only milliseconds. A timestamp returned as a Date and sent back in an equality condition can fail to match the row that produced it, silently preventing an error or completion state from being persisted.

**How to apply:** Use a dedicated operation token or return the timestamp as text for equality guards in asynchronous workflows. Keep Date conversions for display and calculations that do not require exact database equality.
