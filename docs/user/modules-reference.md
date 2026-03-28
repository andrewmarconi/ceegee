# Modules Reference

CeeGee ships with five built-in graphics modules. Each module is a template that you create elements from in the Producer UI.

## Basic Lower Third

**Module key**: `lower-third.basic`
**Category**: Lower Third

A name strap overlay typically positioned at the bottom of the screen. Supports up to three lines of text with optional logo.

### Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Primary text | String | Yes | -- | Main text line (e.g., name) |
| Secondary text | String | No | -- | Second line (e.g., title/role) |
| Tertiary text | String | No | -- | Third line (e.g., pronouns/organization) |
| Alignment | `left` / `right` / `center` | Yes | `left` | Horizontal position on screen |
| Variant | `solid` / `glass` / `outline` | Yes | `solid` | Visual style |
| Show logo | Boolean | Yes | `false` | Whether to display a logo |
| Logo asset | Asset reference | No | -- | Asset ID for the logo image (when show logo is enabled) |

### Actions

| Action | Description |
|--------|-------------|
| Show | Bring the lower third on screen |
| Hide | Remove the lower third from screen |
| Emphasize | Brief attention-grabbing pulse animation |

### Animations

- **Enter**: Slides up from below with fade in
- **Exit**: Slides down with fade out
- **Emphasize**: Scale pulse

---

## Basic Bug

**Module key**: `bug.basic`
**Category**: Bug

A small graphic placed in a corner of the screen, typically used for network logos, watermarks, or persistent brand marks.

### Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Logo asset | Asset reference | Yes | -- | Image to display |
| Position | `top-left` / `top-right` / `bottom-left` / `bottom-right` | Yes | `top-right` | Corner placement |
| Size | Number | No | 80 | Size in pixels |
| Opacity | Number (0-1) | No | 1 | Transparency level |

### Actions

| Action | Description |
|--------|-------------|
| Show | Bring the bug on screen |
| Hide | Remove the bug from screen |

### Animations

- **Enter**: Fades in
- **Exit**: Fades out

---

## Basic Billboard

**Module key**: `billboard.basic`
**Category**: Billboard

A full-width text display for headlines, announcements, or sponsor messages.

### Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Heading | String | Yes | -- | Main headline text |
| Body | String | No | -- | Supporting body text |
| Alignment | `left` / `center` / `right` | Yes | `center` | Text alignment |
| Background color | String | No | `rgba(0,0,0,0.8)` | Background fill color |

### Actions

| Action | Description |
|--------|-------------|
| Show | Bring the billboard on screen |
| Hide | Remove the billboard from screen |

### Animations

- **Enter**: Fades in with scale
- **Exit**: Fades out

---

## Basic Clock

**Module key**: `clock.basic`
**Category**: Clock

A real-time clock display. Updates every second while visible.

### Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Format | `12h` / `24h` | Yes | `24h` | Time format |
| Show seconds | Boolean | Yes | `true` | Whether to display seconds |
| Timezone | String | No | (local) | IANA timezone (e.g., "America/New_York") |
| Label | String | No | -- | Optional label text above the clock |

### Actions

| Action | Description |
|--------|-------------|
| Show | Bring the clock on screen |
| Hide | Remove the clock from screen |

### Animations

- **Enter**: Fades in
- **Exit**: Fades out

---

## Basic Countdown

**Module key**: `countdown.basic`
**Category**: Countdown

A countdown timer that counts down to zero. Can be started, stopped, and reset by the operator.

### Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Duration | Number | Yes | 300 | Duration in seconds |
| Label | String | No | -- | Optional label text (e.g., "Starting in...") |
| Format | `hh:mm:ss` / `mm:ss` / `ss` | Yes | `mm:ss` | Display format |
| Auto-hide | Boolean | No | `false` | Automatically hide when timer reaches zero |

### Actions

| Action | Description |
|--------|-------------|
| Show | Bring the countdown on screen |
| Hide | Remove the countdown from screen |
| Start | Begin counting down |
| Stop | Pause the countdown |
| Reset | Reset to the configured duration |

### Animations

- **Enter**: Fades in
- **Exit**: Fades out

---

## Module configuration in the Producer UI

When you create an element in the Producer UI, you select a module and the UI generates a configuration form based on the module's config schema. Fill in the fields and save -- the configuration is stored as JSON on the element.

The Operator UI also provides quick-edit access to common fields (like text) so operators can make last-minute changes without switching to the Producer view.
