# Operator Status Color-Coding Design

**Issue:** #39 (sub-issue of #29)
**Date:** 2026-03-29

## Goal

Unify and enhance element visibility color-coding across all Operator UI components with a broadcast-switcher aesthetic — state should be obvious at a glance from across the room.

## Design Decisions

- **Two primary states** with transitional treatments, not four distinct colors
- **Red = On Air** — universal broadcast convention
- **Neutral/dark = Ready** — loaded and waiting
- **Entering/Exiting** are animated transitions between the two, not independent colors
- Broadcast switcher style: bold, high-contrast, state-obvious

## Color Palette

| State | Background | Border | Text | Effect |
|-------|-----------|--------|------|--------|
| `visible` (On Air) | `red-500` | `red-400` | white | Steady glow (`box-shadow: 0 0 8px red-500/50`) |
| `entering` | `red-500/60` | `red-400` | white | Pulse animation (~1s, opacity 0.4→1.0), ramping to steady |
| `exiting` | `red-500/40` | `surface-600` | `surface-200` | Fade-out animation (~1s, opacity 1.0→0), settling to neutral |
| `hidden` (Ready) | `surface-800` | `surface-600` | `surface-300` | None — dark, inert |

## Per-Component Application

### ElementGrid

The main surface operators interact with. Each element button gets:

- Full background color treatment from the palette above
- The right-side vertical indicator bar is **removed** — the entire button is the indicator (broadcast switcher style)
- Element name: white when on air, `surface-300` when ready
- Glow/pulse/fade animations apply to the whole button

### LayerFilter

Left sidebar layer list:

- ON AIR / READY tags adopt the unified colors (red tag for on air, neutral tag for ready)
- If any element on a layer is `visible` or `entering`, the layer row gets a left-border accent in `red-500` (replaces current `border-l-primary-500`)
- No full background treatment — layers are navigation, not action targets

### ContextPanel

Right sidebar element editor:

- Visibility Tag at the top uses unified severity mapping: red for `visible`/`entering`, neutral for `hidden`, warn (amber) for `exiting`
- Channel preview iframe gets a thin red top-border when anything is on air

### TopBar

- Existing On Air / Off Air badge keeps its pulse animation
- Uses the same `red-500` token and glow treatment as ElementGrid for consistency

## CSS Animations

Three keyframe animations, defined once and reused:

- **`status-glow`** — steady subtle glow for `visible` state (box-shadow pulse at low amplitude)
- **`status-entering`** — opacity ramp 0.4→1.0 over ~1s, transitions into steady glow
- **`status-exiting`** — opacity fade 1.0→0 over ~1s, box-shadow fades out

## Utility Approach

A shared composable or utility maps `ElementVisibility` to CSS classes, keeping the mapping in one place rather than duplicated across components:

```ts
function useVisibilityStyle(visibility: ElementVisibility) {
  // Returns reactive class object and inline style for the given state
}
```

This ensures all components stay in sync when the palette changes.
