# Repository instructions

This repository owns reusable Oyzu UI foundations, components and interaction patterns, using only fictional public examples. Never copy private platform implementation details, credentials or customer data here.

First-party implementation, tests and scripts are AI-generated. People define requirements, review and approve changes. Preserve upstream component attribution and native generated lockfiles.

Inspect the worktree before editing. Reuse shadcn primitives in src/components/ui. Put shared interaction behavior in src/components/patterns; keep example values, product rules and persistence adapters outside those patterns. Keep interfaces small and typed.

The current UI is an experiment, not an accepted production design or published package. Read README.md for ownership, invariants and validation commands. Test changed behavior through supported user interactions, including relevant failure cases. Do not claim checks that were not run.

Use the official branding assets and guidance in BRAND.md. Never invent or redraw the Oyzu logo.
