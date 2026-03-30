# Operator Safety Guards Design

**Issue:** #40 (sub-issue of #29)
**Date:** 2026-03-29

## Goal

Add safety mechanisms to prevent accidental state changes during live production: a global Clear All action and layer-level locking with server-side enforcement.

## Design Decisions

- **Clear All** is a single global button — no per-layer clear buttons (only one element is active per layer)
- **No confirmation dialog** for Clear All — feedback is visual (locked layers flash their lock icons)
- **Layer-level locking only** — no element-level locks
- **Server-enforced locks** — take/clear/clearAll/action routes reject operations on locked layers with 403
- **Lock state persisted in DB** — survives restarts, shared across all operators

## Feature 1: Clear All

### Button Placement

- In the **TopBar**, next to the On Air badge
- Enabled only when at least one element is on air across any unlocked layer
- Styled as a secondary danger button (red text, no background)

### Behavior

1. Operator clicks Clear All
2. Server clears every visible element on **unlocked** layers in one operation
3. Locked layers are unaffected — their elements stay on air
4. If any locked layers have visible elements, their lock icons in both LayerFilter and ElementGrid flash/pulse to indicate they were skipped
5. State update broadcasts to all connected operators via WebSocket

### API

- `POST /api/workspaces/:workspaceId/channels/:channelId/clear-all`
- Clears all visible elements on unlocked layers
- Returns updated `ChannelState`
- Broadcasts `state:update` event

## Feature 2: Layer Locking

### Data Model

- New `locked` column on the `layers` table: `integer('locked').notNull().default(0)` (SQLite boolean)
- Included in the existing `Layer` type: `locked: boolean`
- `UpdateLayerInput` already supports partial updates — `locked` becomes an updatable field

### API Enforcement

All three mutation endpoints check lock status before proceeding:

- `take.post.ts` — looks up the element's layer, rejects with 403 if locked
- `clear.post.ts` — same check
- `action.post.ts` — same check
- `clear-all` — skips locked layers (no error, just no-op for those layers)

403 response body: `{ error: 'Layer is locked' }`

### Lock Toggle

- Existing `PATCH /api/workspaces/:workspaceId/channels/:channelId/layers/:layerId` endpoint
- Body: `{ locked: true }` or `{ locked: false }`

### UI: LayerFilter

- Each layer row gets a lock icon button on the right side
- `pi-lock` (filled) when locked, `pi-lock-open` when unlocked
- Clicking toggles the lock via the PATCH endpoint
- When locked: the lock icon is prominent (white/bright), when unlocked: subtle (surface-500)

### UI: ElementGrid

- Elements on a locked layer:
  - Greyed out: reduced opacity (`opacity-50`), no hover effects, cursor changes to `not-allowed`
  - Small lock icon (`pi-lock`) displayed on each element button
  - Clicking triggers a CSS pulse animation on that element's lock icon (quick flash, ~0.3s)
  - Click does NOT call the take/clear API
- Elements on an unlocked layer: unchanged from current behavior

### UI: Clear All Feedback on Locked Layers

When Clear All is pressed and locked layers have visible elements:
- Lock icons in ElementGrid for those elements pulse/flash
- Lock icons in LayerFilter for those layers pulse/flash
- This reuses the same pulse animation as clicking a locked element

### CSS Animation

One new keyframe animation:

- **`lock-flash`** — brief brightness pulse on the lock icon (scale 1→1.2→1, opacity boost) over ~0.4s
- Applied via a reactive class that gets toggled on and auto-removes after animation completes
