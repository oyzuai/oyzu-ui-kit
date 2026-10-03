# Name and identifier interaction

Status: UI experiment directed by the maintainer; platform/API contract still to be agreed.

## Research

Reviewed October 2, 2026:

- [Harness entity identifier reference](https://developer.harness.io/3k-docs/platform/references/entity-identifier-reference/): name-derived identifiers, editing during creation, immutability afterward, and scope-based uniqueness.
- [Harness entity name and ID rules](https://developer.harness.io/3k-docs/platform/references/renaming-entities-and-resources/): names can change; same-type entities within a scope need distinct identifiers; duplicate friendly names can be allowed.

Harness documents case-sensitive identifiers and entity-specific character restrictions. Oyzu deliberately uses the requested lowercase, URL-friendly format instead. This implements the documented lifecycle, not a pixel-for-pixel copy of Harness. The linked legacy screenshot URLs were unavailable during research.

## Provisional Oyzu rules

- Display name: human-readable and editable after creation; the demo requires 2–80 characters.
- Identifier: 1–63 ASCII lowercase letters, digits, hyphens or underscores, beginning and ending with a letter or digit.
- Generation: normalize decomposable accents, lowercase, remove apostrophes, replace other runs of punctuation/whitespace with a hyphen, trim edge separators, cap at 63 characters.
- Examples: Production API becomes production-api; Café Déjà Vu becomes cafe-deja-vu; Team’s API / EU_West becomes teams-api-eu-west.
- Generation never changes the display name. Names with no usable ASCII characters require a manually entered identifier; no empty, random or misleading fallback is silently saved.
- Before creation, the suggested ID follows the name until Edit identifier is selected. Custom mode preserves the exact input and shows validation errors instead of silently rewriting it.
- Generate from name explicitly resumes automatic mode. Mode and draft are caller-owned and survive wizard back navigation, discard confirmation and save failures.
- Creation review shows the exact ID that will be saved.
- After successful creation, the ID is read-only, selectable and stable across renames. Name updates do not carry an identifier mutation.
- The example scopes uniqueness to connections within a workspace. Duplicate names are allowed; duplicate IDs are blocked. A suggested suffix starts at -2 and must be explicitly selected before saving.
- No reserved-word list is invented here. The actual routing and public contract owners must decide whether any words need reserving.

## Ownership

IdentityFields owns the name/ID presentation and automatic/custom/locked interaction. Its controlled discriminated props distinguish creation from saved-entity editing. identity.ts owns this provisional normalization/validation policy with focused tests beside it.

App and ConnectionCard supply demo state and operations. The wizard does not own identifiers. Saved workspace identifiers use the same read-only pattern.

This UI cannot guarantee global or concurrent uniqueness. The eventual entity service must validate the public contract, enforce scoped uniqueness atomically at creation, reject identifier updates, and return conflicts without losing the user's draft. Availability checks are advisory. Public schemas remain authoritative in the public Oyzu repository; this experiment adds no production schema and does not replace internal entity keys.

## Acceptance

Browser checks cover generation, manual overrides, returning to automatic generation, preserved wizard state, invalid/empty IDs, collisions and suffix selection, failed creation, and unchanged IDs when saved names are edited. Unit checks cover normalization, allowed characters and length-bounded collision suggestions.

## Compact presentation

The identifier lives on the right side of the name label row, above the name input. A pencil switches the value to an inline editor in the same position. Enter ends editing without submitting the form; the reset icon resumes generation. Saved identifiers remain selectable in that row with a copy control. Explanatory text is available to assistive technology and through control titles; only validation errors and collision suggestions expand below the name.
Editing uses a compact left-aligned input with confirm and cancel controls. Enter confirms valid input and returns to the compact display. Escape or cancel restores the previous identifier and generation mode. Confirming invalid input keeps the editor open.

## Editing saved resources

Saved workspace and connection forms use the same locked identifier row with a copy control and announced clipboard feedback. Copy failure leaves the identifier selectable and displays a manual-copy hint. Save is disabled until trimmed values change. Cancel closes an unchanged form immediately; changed drafts require Keep editing or Discard. Failed operations preserve the draft and immutable identifier. CopyIdentifier owns clipboard feedback; FlowDialog owns pending/error/close behavior; application callbacks own updates and preserve the identifier.
