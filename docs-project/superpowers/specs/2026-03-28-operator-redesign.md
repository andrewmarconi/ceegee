# Operator Page Redesign

## Goal

Reduce clicks required to operate live graphics by replacing the dropdown-based layer dashboard with direct element toggle buttons, and adding a layer filter sidebar and channel preview.

## Current State

- TopBar: workspace/channel selects, ws status, on-air badge, overlay URL copy
- Left panel (Rundown): flat sorted element list with status badges
- Center (LayerDashboard): card per layer with dropdown + TAKE/CLEAR buttons
- Right panel (ContextPanel): element preview iframe, quick-edit fields

## New Layout

### TopBar

Left side reads as a breadcrumb flow: Logo | "Operator" > Workspace dropdown > Channel dropdown

Right side unchanged: Overlay URL copy button, WebSocket status tag, On Air/Off Air tag.

### Left Sidebar — Layer Filter

Replaces the Rundown component. Vertical list of selectable layer items.

- First item is always "All Layers" with a count of how many layers currently have a live element (e.g. "3 ON AIR").
- Below that, one item per layer showing the layer name and a status tag: "ON AIR" (red) if the layer has a visible element, "READY" (grey) otherwise.
- Clicking a layer filters the center panel to show only that layer's elements.
- Clicking "All Layers" shows all layers in the center (default state).
- Selected item has a highlighted background.
- If there is only one layer in the channel, then no need to also show "All Layers"

### Center Panel — Element Grid

Replaces the LayerDashboard component. Displays layer sections, each containing element buttons.

**Layer sections:**
- Each layer renders as a section with a header showing the layer name.
- When "All Layers" is selected in the sidebar, all layer sections are shown, scrollable vertically.
- When a specific layer is selected, only that layer's section is shown.

**Element buttons:**
- Each element is a button spanning the row, with the element name on the left.
- Right edge of each button has a vertical status indicator bar:
  - Live element: red bar with gentle pulse animation.
  - Not-live element: dark grey bar, no animation.
- Clicking the button toggles the element:
  - If not live: takes the element (engine auto-clears any other live element on the same layer).
  - If live: clears the element.
- On hover, a pencil icon appears overlaid on the right side of the button. Clicking the pencil opens the element in the right sidebar context editor without toggling live state.
- Elements are sorted by sortOrder within each layer section.

### Right Sidebar — Preview + Context Editor

Adds a channel preview above the existing context editor.

**Channel Preview:**
- 16:9 aspect ratio iframe showing `/o/{workspaceId}/channel/{channelId}`.
- Always visible when a workspace and channel are selected, regardless of element selection.
- Updates in real-time via the overlay's own WebSocket connection.

**Context Editor:**
- Unchanged from current behavior: shows selected element's name, status tag, and quick-edit fields for string config values.
- "Save Changes" button at the bottom.
- Empty state message when no element is selected: "Click the pencil icon on an element to edit."

## Components Affected

| Component | Action |
|-----------|--------|
| `operator/TopBar.vue` | Modify: restructure left side as breadcrumb flow |
| `operator/Rundown.vue` | Remove: replaced by LayerFilter |
| `operator/LayerFilter.vue` | Create: new layer filter sidebar |
| `operator/LayerDashboard.vue` | Remove: replaced by ElementGrid |
| `operator/ElementGrid.vue` | Create: new center panel with toggle buttons |
| `operator/ContextPanel.vue` | Modify: add channel preview iframe above editor, change empty state text |
| `pages/app/[workspaceId]/operator.vue` | Modify: wire new components, update state management |

## Interaction Flow

1. User selects workspace and channel in TopBar.
2. Layers and elements load. Center shows all layers with element buttons.
3. User clicks an element button to take it live. The button's indicator turns red and pulses. Any previously live element on that layer auto-clears (its indicator goes grey).
4. User clicks a live element button to clear it. Indicator goes grey.
5. User hovers an element and clicks the pencil icon to open it in the context editor on the right. This does not affect live state.
6. User can filter the center view by clicking a layer in the left sidebar.
7. Channel preview in the right sidebar shows the live output at all times.

## Out of Scope

- Changes to the producer page
- Changes to the engine/backend logic (take/clear already work as needed)
- Changes to the overlay rendering
- Keyboard shortcuts
