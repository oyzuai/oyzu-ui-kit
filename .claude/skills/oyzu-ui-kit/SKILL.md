---
name: oyzu-ui-kit
description: Ground any Oyzu screen, mockup or component in the oyzu-ui-kit tokens, type, shell anatomy, status vocabulary and rules. Use before designing or styling anything that should look like Oyzu.
---

# Oyzu UI kit grounding

The kit is `oyzuai/oyzu-ui-kit`: React 19, Tailwind v4, shadcn primitives (Radix Nova) in `src/components/ui`, shared patterns in `src/components/patterns`, example pages in `src/examples`, Storybook for review. Read `AGENTS.md`, `BRAND.md` and `README.md` first when working in the repo. Anything built outside the repo (a mockup, a prototype, a doc figure) still uses the values below so it reads as Oyzu, not as a generic template.

## Type

- Family: **Geist Variable** (`@fontsource-variable/geist`); monospace for identifiers, digests, emails and log text.
- Eyebrow: 10px, uppercase, letter-spacing 2px, deep blue `#0a1dbb`. One per page heading, above the h1.
- h1: weight 550, `clamp(36px, 4.6vw, 66px)`, line-height 1.05, letter-spacing -2.8px. Entity pages use a smaller h1 (34–40px, tracking -1.3px) with a deep-blue left bar.
- Description under the h1: 14px, muted. Body 14px, line-height 1.5; table and meta text 12–13px; table headers 10–11px uppercase.
- The `.page-heading` block ends with a 2px foreground rule and a 94px bright-blue accent at the left end.

## Color tokens (light)

| Token | Value | Use |
|---|---|---|
| surface-base | `#f6f5f1` | page background |
| surface-panel | `#fffefa` | panels, cards when allowed |
| surface-muted | `#e8e9e2` / `#eeefe8` | quiet fills, hover |
| line-subtle | `#d5d6ce` | rules and borders |
| line-strong | `#a3a79e` | inputs, emphasis rules |
| text-main | `#182024` | body |
| text-muted | `#62645e` | secondary |
| primary / link (deep blue) | `#0a1dbb` | actions, active nav, eyebrows, links |
| navy | `#06144d` | foreground accents, document headers |
| bright blue | `#0879ff` | the heading accent and focus rings only |

Status (catalog.css), text on tint: healthy `#196442` on `#edf8f1`; pending `#304dad` on `#eef2ff`; paused `#536177` on `#f0f3f8`; warning `#885309` on `#fff6df`; failed `#a02f30` on `#fff0ef`.

Dark (dark-theme.css): bg `#11181e`, panel `#192229`, muted `#222e35`, line `#37454f`, text `#e7ecef` / `#abb9c2`, primary `#395bee`, success `#91d9b4` on `#193a2d`, danger `#ffa7a0` on `#42282a`, warning `#ecc585` on `#3a3222`. Apply dark under `html.dark`, and keep the navigation surface the same in both themes.

## Radii and shape

`--radius: 0.25rem`. Buttons are 3px. Status pills 2–5px. Avatars and workspace marks are 2px squares, never circles. Nothing in the kit uses 8px+ radii, pills, or drop shadows beyond a 1px hairline (`box-shadow: 0 2px 3px #06144d08` at most).

## App shell anatomy

- **Navigation** (left, 234px): surface `#182337` in both themes, text `#f1f5fc`, muted `#b6c3d8`, border `#354258`, hover `#28374e`. Top: the reverse full logo (`public/brand/oyzu-full-logo-reverse.svg`, unchanged copy). Then the context trigger (square avatar, organization / project, chevron). Groups have 10px uppercase letter-spaced labels; links are 12px with a lucide icon; the current link is white on `#294acb`. Bottom: account widget (initials square, name, mono email), "Collapse sidebar", and the mono caption.
- **Topbar**: white (`--app-canvas-surface`), 64–73px, breadcrumb on the left, utilities on the right, hairline bottom border.
- **Page canvas**: white in light, `#192229` in dark. `PageLayout` variants: `workspace` (dashboard), `discovery` (catalog and lists), `entity` (one record, identity block, optional aside), `ledger` (audit and history).

## Components to reuse

Primitives in `src/components/ui`: button (variants default, outline, secondary, ghost, destructive, link; sizes xs, sm, default, icon), badge, input, textarea, select, checkbox, switch, label, table, dialog, alert-dialog, dropdown-menu, tooltip, accordion, progress, skeleton.

Patterns in `src/components/patterns`: `PageLayout`, `NavigationSidebar`, `StatusBadge` and `PendingIndicator`, `ResourceTable`, `FeedbackBanner`, `EmptyState`, `SearchField`, `TextField`, `SettingRow`, `ConfirmAction`, `FlowDialog` / `WizardDialog` / `WizardModal`, `ResourcePicker`, `SectionNavigation`, `CopyIdentifier`, `SecretSelector`, `DeviceCodeInput`, `IdentityFields`, `ConnectionDiagnostics`, `DocumentEditor`, `AccountMenu`, `AppearanceControl`. Prefer composing these over new markup; put example values and product rules outside the pattern.

## Status vocabulary

Exactly five words, with their lucide icons: **Healthy** (CheckCircle2), **Pending** (CircleDashed), **Paused** (CirclePause), **Needs attention** (TriangleAlert), **Failed** (XCircle). A running process shows `PendingIndicator` ("Working…" with a spinner). Do not invent new status words (no "Rolling", "Live", "Done", "OK"); map them to these five and put the detail in text next to the badge.

## Rules

1. Surfaces are separated by spacing and rules, not nested cards. One panel level at most; tables are rule-separated rows with uppercase headers.
2. Icons are lucide-react only, 12–16px, never emoji or glyph characters.
3. Never invent, redraw, recolor or stretch the logo; copy from `public/brand` unchanged (see `BRAND.md`).
4. Keep copy in sentence case, plain verbs, from the user's point of view. Buttons say what happens ("Save changes").
5. Keep interfaces small and typed; shared behavior goes in `patterns`, screens in `examples`.
6. Respect `prefers-reduced-motion`; motion only answers a user action.
7. Use fictional public example data only. Never copy private platform details.

## Validate before claiming done

```
npm ci
npm run build
npm run lint
npm test
npm run build-storybook
```

Add or update a story for anything visual, and check it in Storybook (light and dark). Do not claim checks that were not run.
