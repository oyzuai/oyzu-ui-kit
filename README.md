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

## Use from another app

Experiments stay in `src/examples` and `src/App.tsx` with fake data. Only what `src/index.ts` exports is a contract for other apps. Pin the kit by git commit and import it once at the app root:

```tsx
import "oyzu-ui-kit/styles.css";
import { Button, ResourceTable } from "oyzu-ui-kit";
```

The package exports TypeScript source, so the consuming app needs Vite with React and `@tailwindcss/vite`; `styles.css` adds an `@source` for the kit so Tailwind finds its classes under `node_modules`. Source files use relative imports, with no `@/` path alias, so no consumer configuration is required. Brand images are referenced as `/brand/...`; the consuming app serves `public/brand` at that path. Shadcn's CLI writes `@/` imports; rewrite them to relative paths after adding a primitive.

`oyzu build` builds the playground through `build.yaml`.

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
- `src/index.ts`: the public entry point, exporting `components/ui` and `components/patterns` only. Examples and `App.tsx` are never exported.
- `src/styles.css`: the single stylesheet (theme tokens, brand colors, visual language and pattern styles) that the playground, Storybook and consumers all load.
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

## Component gallery

Use **Browse components** in the preview header (or **Components** in the desktop sidebar). The gallery includes:

- Resource table: name/identifier cells, sorting, search, status filtering, per-page selection, cross-page bulk selection, pagination, row menus and a details dialog.
- Confirmed removal: explicit typed confirmation, pending state, disabled duplicate submissions and recoverable failure. Sample data only.
- Form controls: labeled select, textarea with character count, checkbox, validation, switches and managed/disabled preferences.
- Status and feedback: five status badges, pending indicator, information/success/warning/error banners, and dismissible notifications.
- Empty and loading states: first-use and filtered-empty states, skeleton rows, determinate progress, and a recoverable error example.
- Supporting shadcn primitives: alert dialog, dropdown menu, tooltip, accordion, checkbox, select, textarea, table, skeleton and progress.

Ownership: shared behavior lives in src/components/patterns; resource values, filtering policy and demo operations live in src/examples/component-gallery.tsx. ResourceTable owns local sorting, pagination and visible-page selection; selection is controlled by its consumer. It renders typed column definitions and never fetches data. ConfirmAction invokes an injected async operation and never treats a rejection as success. Feedback and empty-state components accept content and caller-provided actions.

New patterns use src/components/patterns/catalog.css along with the existing theme. Gallery-only layout styles live beside the example. New Storybook entries cover the gallery, status badges, feedback, empty states and success/failure confirmation dialogs.

The imported Progress primitive is adjusted to pass its value to Radix so assistive technology receives the same progress value that is rendered visually.

## Nested account navigation

Open `/#account/profile` (or choose Account) for an interactive page with Profile, Security, API keys and Notifications sections. `SectionNavigation` owns the responsive navigation presentation: ordinary links with `aria-current` on desktop and a labeled section picker on small screens. The example owns URL hash navigation, fictional data and session-only state; links support deep linking and browser Back/Forward. Draft profile changes survive section switches while the account page stays mounted, but are not persisted across reloads or leaving the account example. Security and key actions operate on sample records only.

The shared navigation pattern lives in `src/components/patterns/section-navigation.tsx`; account-specific content lives in `src/examples/account-settings.tsx`. Browser tests cover history, draft retention, saving, sample-key revocation, responsive navigation and automated accessibility checks.

## Visual language

`src/design.css` owns the shared visual styling for the app and Storybook, including portal dialogs and menus. Warm neutral surfaces, charcoal text, strong heading hierarchy, fine dividers and small control radii replace nested pale-blue cards. Official Oyzu blue is reserved for actions, selected navigation and restrained accents. Keep identifier editing compact. Account settings, workspace settings and the gallery use this same foundation.

## Full page studies

Open `/#pages/resources`, `/#pages/detail` or `/#pages/activity` to explore sparse full-page compositions. These examples use up to 1840px of available content width, with fluid gutters. Tables span the primary region even with only two rows; empty states stay aligned to the top left. Detail and activity pages use a flexible primary region and a 240–290px secondary rail; the rail moves below at smaller widths. Prose remains limited to 65 characters per line. `PageLayout` owns this reusable structure; fictional content and interactions live in `full-pages.tsx`. Use the content selector to compare empty, sparse and populated lists.

## Searchable resource picker

The resource list includes a Filter by project picker. `ResourcePicker` owns a searchable selection dialog with name/identifier search, keyboard navigation, recent groups, unavailable options and clearing. The caller supplies resources, the selected identifier and recent history; no storage or authorization rules live in the pattern. Escape cancels without changing the selection and closing returns focus to the trigger. The example keeps five recent choices in session state. Storybook includes 200 fictional resources to exercise longer lists. The dialog uses a bounded scrolling results region and mobile viewport sizing.

## List actions

Project names are links to full pages; identifiers remain separate, selectable text. Quick view opens a side drawer (full screen on phones). A persistent row menu offers Open page, Edit and Delete. Edit reuses the shared dirty-form lifecycle and preserves identifiers; Delete names the target and requires confirmation. Closing returns focus to the invoking control; deleting a row moves focus to list search. Filters and selection remain in the mounted list. All mutations are session-only examples.

## Full-page connection editor

Open `/#pages/connection` for Basics, Authentication and Behavior sections, optional advanced settings, and a persistent save/cancel bar that appears for modified drafts. Creation reuses `IdentityFields`; after a successful save the identifier is immutable. Validation focuses the first invalid field and opens advanced settings when required. Failed saves retain the draft; pending saves disable editing and app navigation. `useGuardedHash` coordinates unsaved-change prompts for app links, navigation buttons and hash history, plus the browser before-unload warning. Explicit Cancel changes restores the last saved snapshot. The example uses fictional credential references and never sends requests or persists configuration across reloads. Save behavior controls provide successful, failed and slow-save scenarios.

## Connection wizard and scoped secret references

`/#pages/connection-wizard` demonstrates Basics → Authentication → Behavior → Review & test. Authentication choices include anonymous, username/password via a secret reference, API token reference, simulated OAuth, and managed identity. The review contains reference metadata only. Configuration or context changes invalidate test success; creation requires a successful simulated test. Outcomes include invalid credentials, insufficient permissions and unreachable service. Save failures retain the draft and test result. No network authentication, secret retrieval or durable creation occurs.

`/#pages/secrets` demonstrates the reusable `SecretSelector`. Callers supply already-authorized reference metadata and receive a selected reference ID. It builds on `ResourcePicker` search and keyboard behavior, adding scope filtering. The example uses one explicit Account → Organization → Project → Component lineage and allows current scope plus ancestors. Project-to-descendant-component visibility remains unresolved; this example is not authoritative access policy. Production must authorize exact scope instances server-side and revalidate at test/save time. The picker neither resolves values nor grants access. Context changes clear the example selection. Both references have Storybook entries.

## Members & access

Open `/#pages/members` for a searchable, role/status-filtered organization membership list and a scoped-access drawer. Row actions cover role changes, pending-invitation resend/revoke and member removal. Role review states the organization role before/after, inherited project/component changes and unchanged account access. Pending members show proposed access after acceptance. These fictional roles and inheritance rules are UI examples, not authorization policy.

Invitations accept one or up to 20 comma/newline-separated addresses, validate the entire batch, reject repeated/existing addresses, and present a role/access summary before creating pending records. No email is sent. Action behavior supports slow actions and a one-shot failure so drafts and confirmations can be retried in place. Successful deletions remove only the organization record, clear its selection and move focus to the list heading; separate account access is described as unchanged. Shared `FlowDialog`, `ConfirmAction` and table contracts own interaction mechanics; `members-model.ts` owns fictional role definitions and invitation validation. Browser tests cover filtering, all four scopes, invitation validation/review/retry, role impact and focus, resend/revoke/removal, pending submission protection, and mobile/accessibility behavior. Storybook includes the full example.

### Global sidebar navigation

`NavigationSidebar` owns responsive presentation, group disclosure, accessible icon-rail labels, and drawer focus. Desktop users can collapse to an icon rail; mobile users get a modal drawer with Escape/outside dismissal and focus restoration. Accepted navigation closes the drawer and focuses the main content; the existing unsaved-change guard can defer navigation without dismissing the menu. Resizing to desktop closes the drawer and focuses the sidebar toggle.

Example destinations and grouping live in `src/examples/navigation.ts`. The URL is the active-page source of truth, including browser history. Group toggles never navigate. Navigating to a page reveals its group. `src/examples/sidebar-preferences.ts` stores desktop collapse and group preferences locally; temporary mobile opening is not persisted. Storage failure falls back to in-memory behavior. Workspace, Connections, Personal and UI library are exploratory groupings, not a production information architecture.

### Sidebar account and session reference

`AccountMenu` presents the caller's identity and account destinations using the shared dropdown primitive. The sidebar renders it at the bottom in both drawer and desktop modes; the compact rail keeps an accessible avatar trigger. Example profile saves update the sidebar identity, and profile drafts survive navigation and cancellation of logout. Confirmed logout clears the draft.

`SessionExample` is a fictional sign-in/sign-out experience, not authentication. It collects no credentials and calls no identity provider. A per-tab sessionStorage flag remembers the signed-out preview; profile data remains in memory. The demo includes pending and retryable failed sign-in states. Actual authentication, session revocation, email verification, and authorization require server-owned contracts in a consuming application.

### Connector catalog

`src/examples/connector-catalog.tsx` owns the illustrative connector discovery page and its search/category state. Connector metadata lives in `connector-data.ts`; selecting a tile passes that record into the existing wizard. The example inherits the fixed Checkout service project context, without a scope selection step. Search and filters survive returning from the wizard during this mounted preview. Dirty configuration uses the existing navigation guard. Authentication options and endpoints are illustrative UI presets, not verified production connector contracts. The standalone wizard remains available for testing all authentication states.

Brand marks are bundled from Simple Icons 16.0.0; provenance is recorded in `public/brands/README.md`. These examples do not connect to external services.

### Modal connector setup

The catalog's Wizard presentation control compares full-page and modal setup. Both render `ConnectionWizard`, sharing fields, validation, secret selection, and test-before-create behavior. `WizardModal` owns dismissal protection and focus return. Dirty dismissal asks before discarding; pending operations block dismissal. Desktop uses a bounded dialog and mobile uses the full viewport. Simulation controls remain in the full-page reference.

### Visual and source connector drafts

`DocumentEditor` supplies CodeMirror YAML/JSON views and explicit apply/discard. The example caller owns the draft projection and validation. Unknown keys and wrong types are rejected, YAML duplicate keys/aliases are rejected, and invalid source stays editable. Applying source restores Visual and invalidates wizard tests; pending source blocks wizard navigation/save. Existing editor identifiers remain immutable. Saved edits show field-level old/new values under Review changes.

The two existing connector examples retain their own provisional projections; these are not authoritative platform schemas or Git sync contracts. Source mode normalizes formatting/comments on conversion. OAuth authorization and test state are runtime state and are never serialized. Secrets are references only. Diff display compares the current in-memory saved baseline, not a durable audit log; revision restore and Git synchronization are future work.

The source editor now offers Visual and YAML only. Format YAML uses two-space indentation, block collections, and an 88-column preferred line width; syntax errors preserve the source. Applying serializes the validated draft into canonical YAML. The explicit formatter preserves YAML comments; converting through the visual representation does not preserve comments. JSON mode has been removed.

### Audit trail reference

`src/examples/audit-page.tsx` presents fictional events owned by `audit-model.ts`. Search and resource/outcome/source/date filters combine; export downloads only the filtered records. Event links open a focus-managed detail drawer with exact UTC timestamps, actor and scope, and before/after field values. Denied/failed events explicitly have no configuration changes; sensitive values remain redacted in both display and export. Desktop and mobile layouts expose the same event detail. This is a read-only reference, not live audit storage, Git sync, retention policy, or revision restoration.

### Entity revisions and Git management

`connection-history.tsx` composes the shared YAML editor with the fictional revision records and validation owned by `connection-history-model.ts`. Overview, Configuration, History, and Git source share one in-memory draft. Comparisons expose complete YAML snapshots and changed fields. Restore loads an older snapshot as a draft; test and save append a new revision without mutating history. Source editing blocks tab switches until apply/discard. Test and save failure controls preserve drafts.

Git-managed edits produce a local simulated change request; simulated merge appends a Git revision. Incoming commits require explicit adoption, and local drafts are not automatically overwritten. Keeping a local draft marks divergence and blocks merging until a repository version is resolved. Sync failure/retry, incoming changes, and source metadata are demonstrative; no real repository, external pull request, network test, durable history, or audit store is connected. Refresh resets this example.

### Navigation context

The sidebar context switcher selects an organization and optionally a project. It supports project search, organization-only navigation, empty organizations, and the compact sidebar/mobile drawer. The sticky header identifies the active context while scrolling. The shared context provider updates page headings; connector creation derives organization/project secret scope from it. Context switching is blocked during pending operations and confirms discard for tracked connection drafts. Each switch remounts the current page with fresh fictional data; this is not tenant isolation, authorization, or persisted routing.

## Sign-in reference

Open `/#session/login` in a fresh page to explore Google, GitHub, and work SSO. `src/examples/sign-in-flow.tsx` owns the fictional provider scenarios and local email discovery; `SessionExample` reuses the existing session callbacks and logout confirmation. Use `alex@example.com` for Acme SSO. Provider response controls expose success, unavailable, denied-access and expired-request outcomes. Canceling a pending handoff invalidates its completion. No OAuth/SAML/OIDC integration or real authentication is implemented; the preview does not send email addresses to a provider. Production discovery, authorization and session handling belong on the server.

Verified with `npm run build`, `npm run lint`, and the seven browser tests in `tests/session.spec.ts` and `tests/sign-in.spec.ts`, including mobile overflow and automated accessibility checks. The existing bundle-size warning remains.

## Workspace arrival and invitations

The login preview's **After sign-in** control selects last-context restoration, the workspace picker, or an invitation. `src/examples/workspace-data.ts` owns the shared fictional organization/project directory and validates optional session-storage context before reuse. Both the sidebar switcher and sign-in arrival consume that directory. The picker supports search, organization-level entry, and organizations without projects. Invitation review shows the inviter, recipient, project and role, with accept, defer, failure/retry and expired states. Acceptance enters the invited project; it does not create a real membership. Authentication, invitation validation and authorization remain simulated. Context is remembered only within the browser tab's session, not across devices.

Acceptance coverage lives in `tests/workspace-arrival.spec.ts`: chosen context and subsequent restoration, invitation outcomes, mobile accessibility, search and an empty organization. This iteration covers workspace selection and invitation review; real invitation links, server membership checks, and session-expiry draft recovery remain future work.

## Session expiry recovery

Use **Preview session expiry** above the page or inside the connection wizard footer. `src/examples/session-recovery.tsx` owns the simulated recovery outcomes; it keeps the existing editor subtree mounted, blocks background interaction and hash navigation, and resumes only for the original account with retained access. Different-account and removed-access outcomes keep the draft paused and offer sign-in again. It reuses the sign-in reference, including provider failure/cancellation. Preview expiry is disabled during a reported busy editor operation.

Draft retention is in-memory only: no draft or secret is copied into browser storage, and a reload loses the draft. This is a UI reference, not a real expiry detector or authorization boundary. Server authentication, access revalidation and pending-request handling require production integration. Tests cover wizard step/values, invalid raw YAML, account mismatch, removed access, mobile accessibility, and recovery over an already-open wizard modal.

## OAuth device authorization reference

Open `/#pages/oauth` (Connections → OAuth device flows). The connector side generates a copyable five-minute user code, displays a verification address, waits for simulated approval, and supports denial, cancellation, expiry and replacement. Open authorization page opens a local provider dialog, not the displayed example-domain URL. The connection wizard's OAuth option reuses this reference and requires approval before continuing. This is generic device-flow UI, not a claim that every catalog provider supports this grant or these permissions.

The Oyzu device side accepts preview code `WDJB-MJHT`, asks for simulated sign-in, then displays application identity, current context and requested permissions. Explicit code confirmation is required to approve. Denied and expired requests do not grant access. The code resets only when starting another preview; all data is fictional. No device secret, access token or refresh token is issued, stored, or embedded in connector YAML.

Interaction research: [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628), especially user interaction and terminal pending/denied/expired outcomes. This UI uses local callbacks rather than implementing token polling. Production adapters must validate requests server-side, enforce expiry, respect polling intervals and slow_down, and never treat a UI approval state as authorization. Browser redirect OAuth and managing/revoking existing grants are separate future references. Verification: build, lint, and `tests/oauth-device.spec.ts` cover connector outcomes, wizard integration, code validation, explicit consent and mobile accessibility.
`/authorize/device` is now the standalone authorization entry: it mounts independently of App, portal sign-in state, navigation and context providers. The OAuth gallery opens it in a separate tab. Consent context is supplied by the fictional request. This is still served by the preview app; no separate identity service or Keycloak deployment is configured.

## Appearance

The bottom-right Appearance control offers Light, Dark and System across the portal and standalone authorization pages. Selection persists in local storage, synchronizes across tabs, and follows live operating-system changes in System mode. Storage is optional. Existing light colors remain as fallbacks while shared surface, text and border tokens define dark equivalents in `src/dark-theme.css`. Official reverse Oyzu logo variants (blue mark and white lettering) are used on dark backgrounds; provider logos retain their artwork on light backplates. CodeMirror retains its existing dark editor palette.

`tests/appearance.spec.ts` checks persistence, system changes and automated contrast/accessibility across authorization, connector catalog, settings, component gallery, profile, audit and connection wizard pages. This does not replace human review of every interaction state.

## Access assignment reference

`/#pages/access` demonstrates an assignments list, searchable principals/states, assignment details and a Who / What / Where / When / Review wizard. Example values live in `src/examples/access-assignments.tsx`; shared dialog and page primitives own presentation. Published role/resource-group revisions are displayed separately. The prototype uses fictional memberships, groups and automation identities and describes future descendant coverage explicitly. Current scope is inherited from navigation; the account is the fixed Acme demo fixture.

Standard grants activate locally. Elevated grants enter pending review and an explicitly labeled simulation can approve/activate, reject, or fail activation. This is not self-approval, an authorization engine, or a production schema. The scoped grant limit, action summaries and lifetime choices are fixture data; the prototype does not implement scheduled activation, timed expiry, authoritative membership lookup, real grant validation, or a separate reviewer session. Independent-grant explanations and revocation affect only the in-memory example. Definition editors and the full review inbox remain separate future references.

Verified with build/lint and `tests/access-assignments.spec.ts`: revision/coverage review, activation and revocation, pending-to-failed activation, mobile accessibility, and preserving drafts when dismissal is cancelled.

## Composition study

PageLayout exposes workspace, discovery, entity and ledger variants. The provisional composition layer in src/visual-language.css owns their visual hierarchy plus personal settings and assignment dialog families. Shared controls and business rules remain with their existing owners. Discovery emphasizes selection; workspaces emphasize scanning; entities emphasize identity; ledgers emphasize chronology. Wizard and review layouts intentionally differ. Responsive layouts and both appearances are checked through existing browser interactions and accessibility checks.

## Dense access library

The People & access example (#pages/access-library) contains fictional account members, illustrative role bundles and resource-group drafts. It exercises search, pagination, category and individual permission selection, exact resources, explicit descendants, selector unions, account-owned definitions, and draft review. It is not an authoritative permission catalog or backend evaluator. Drafts live only in the mounted example; published revisions and live assignments are not changed. Owner-only mutations, query predicates and exclusions are intentionally absent. Validate with tests/access-library.spec.ts.

## Connected RBAC example

`src/examples/rbac-model.ts` owns the fictional account's memberships, definition revisions, assignments, and session audit events. The directory, composer, explanation and audit pages subscribe to that same in-memory model; navigation preserves changes and a reload resets them. The old single-role membership study remains at `#pages/member-patterns`; `#pages/members` opens the unified directory.

Published revisions are immutable. Saving edits updates a draft by stable ID and revision; publishing does not migrate assignments. Revision changes create a pending replacement, keep the original active through rejection/failure, and revoke it only after successful replacement activation. Expiration ends a grant. Membership suspension suppresses its use without deleting the assignment. Local group membership changes affect group-derived access; provider-managed groups are read-only here.

This is an interaction reference, not authorization enforcement. Production evaluation, grant authority, reviewer eligibility, concurrent revision validation, and persistence must be server-owned. The reviewer and failure controls are explicitly fictional. The bounded access explanation checks the example action, coverage, assignment state and membership; it does not substitute for a policy engine.

Run `npx playwright test tests/access-library.spec.ts tests/access-assignments.spec.ts tests/rbac-journey.spec.ts tests/audit.spec.ts tests/navigation.spec.ts` for the connected UI paths, dirty editing, publication, migration failures, membership suppression, provenance, and mobile accessibility checks.

The standard assignment composer presents Recipients, Role, and Resource coverage together, with a separate review before activation or approval. Multiple recipients create independent assignments. Standard assignments have no expiration and remain assigned until revoked; there is no duration selector. Existing expiration fixtures remain available for access-explanation testing.

## Automation identity reference

Open `#pages/automation` for the fictional request, administrator decision, and authentication setup flow. Creation and editing use a dedicated page with left-side Identity, Requested access, and Review sections; authentication uses Authentication and Approved access sections. Sections preserve the draft and become horizontal navigation on mobile. Request a name, purpose and direct resource/action entries; authentication controls appear only after approval. Exact resources are the default; broader typed scope selectors disclose current and future descendants. Each entry keeps its actions paired with its own targets in the request, review, and authentication summary. No reusable role or resource group is selected. The administrator preview toggle represents a separate reviewer. Request changes requires a reason, and resubmission increments the request revision. The GitHub Actions reference includes simulated verification failure/retry and explicit activation after verification. It makes no provider calls and creates no credentials. This example does not enforce production authorization or write grants to the shared assignment inventory. Refresh resets its session data.

Validate this flow with `npx playwright test tests/automation-identities.spec.ts`.

Automation access uses expandable resource categories with explicit read-only/read-and-write metadata levels and separate lifecycle actions. Selected-resource pickers preserve independent access sets; choosing all discloses future matching coverage. These fictional categories currently cover components, projects and organizations.
