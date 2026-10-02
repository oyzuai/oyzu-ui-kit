# Oyzu UI kit

An experimental design system for Oyzu, built with React, TypeScript, shadcn/ui (Radix Nova), Tailwind CSS and Storybook.

The first playground explores workspace editing and a three-step setup flow. All data is fictional and lives in memory; refreshing resets it. No external service or account is connected.

## Run

Use Node.js 24 and npm 11 (the initial verified toolchain).

```sh
npm ci
npm run dev
npm run storybook
```

Vite serves the playground; Storybook serves the component and experience catalog on port 6006.

## Try the interactions

- **Edit details:** enter invalid values, save changes, or press Escape after editing to inspect discard protection.
- **Set up a connection:** name it, choose a behavior, go back, and review before creating it.
- **Save behavior:** choose success, a three-second delay, or failure before opening a flow. Failure mode fails every attempt so retry and draft retention can be inspected.
- **Preferences:** toggle the session-only notification preference.
- **Pattern notes:** read the provisional interaction principles.

These are experiments for review, not accepted production contracts or a published npm package. The visual direction is provisional.

## Ownership and contracts

- `src/components/ui/`: upstream shadcn primitives, added through its CLI. Keep upstream attribution.
- `src/components/patterns/flow-dialog.tsx`: shared asynchronous form lifecycle, submission feedback and dirty-close confirmation. Callers supply values, validation and an async operation. Rejected operations remain visible without losing input. A pending operation blocks dismissal and duplicate submission.
- `src/components/patterns/wizard-dialog.tsx`: step navigation and progress. Callers supply step content, optional validation and a final async operation. Navigation does not own domain values.
- `src/components/patterns/text-field.tsx`: label, input, help and accessible error association.
- `src/App.tsx`: example composition, fake workspace values and injected save scenarios. Product policy, credentials and real network operations do not belong in the UI patterns.
- `src/index.css` and `src/App.css`: initial theme and visual experiments; patterns currently require both stylesheets.
- `src/examples/`: Storybook catalog.
- `tests/`: browser tests through supported user interactions.

The accepted direction for this experiment is shadcn as a starting foundation, with Oyzu-owned interaction patterns layered above it. Success means editable details validate and save; failures preserve drafts; dirty dismissals require confirmation; wizard back navigation preserves answers; and both flows work on a narrow screen and by keyboard.

## Verification

```sh
npx playwright install chromium
npm run build
npm run lint
npm test
npm run build-storybook
```

Playwright covers validation, persistence within the session, dismissal, slow and failed saves, wizard navigation, mobile fit and automated axe accessibility checks. Automated checks do not substitute for assistive-technology and human usability review.

## Development and attribution

First-party implementation, tests and scripts are AI-generated; people direct, review and approve changes. This first experiment was directed in conversation and generated with Codex. Maintainer review is still pending. Dependencies and imported components retain their original authorship and licenses.

The shadcn notice is in `THIRD_PARTY_NOTICES.md`. First-party open-source licensing and package publication are intentionally not selected by this experiment; the package remains private until the repository's release policy is established.

## Name and identifier pattern

See [IDENTITY.md](IDENTITY.md) for the Harness research, provisional rules and ownership boundary. In the connection wizard, type a friendly name to generate an identifier, use Edit identifier to customize it, then create and edit the connection to verify that only its friendly name changes. Add another connection with the same name to try collision handling. Storybook includes generated, custom and saved states under Patterns / Name and identifier.
