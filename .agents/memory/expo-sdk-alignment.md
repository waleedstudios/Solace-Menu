---
name: Expo SDK compatibility
description: Resolve native package compatibility using the active SDK, not older generic version examples
---

Use the active Expo SDK's compatibility check and doctor results when aligning native modules. Generic integration examples may pin modules for an older SDK; mixing that pin with newer AuthSession/native packages creates incompatible native dependencies.

**Why:** The mobile scaffold uses SDK 57, whose compatibility check requires the matching SDK-generation crypto module rather than a generic example's older crypto pin. Dependency alignment passed all doctor checks after using the SDK's own recommendations.

**How to apply:** Run Expo's dependency check and doctor before debugging native code. Keep the existing SDK generation. If fresh SDK patches run into the package-age delay, inspect the complete required SDK dependency graph instead of repeatedly retrying one dependency at a time. Never permanently relax the workspace's supply-chain protections.
