# OBS Setup

CeeGee outputs transparent HTML overlays that composite over your video sources in OBS Studio via Browser Sources.

## Adding a Browser Source

1. In OBS Studio, go to your scene and click **+** under Sources.
2. Select **Browser**.
3. Name it (e.g., "CeeGee - Main Program") and click **OK**.

## Configuring the Browser Source

### URL

Set the URL to one of CeeGee's overlay routes:

**Channel output** (most common):
```
http://localhost:3000/o/<workspaceId>/channel/<channelId>
```

**Layer output** (single layer only):
```
http://localhost:3000/o/<workspaceId>/layer/<layerId>
```

**Element output** (single element only):
```
http://localhost:3000/o/<workspaceId>/element/<elementId>
```

Replace `<workspaceId>`, `<channelId>`, `<layerId>`, or `<elementId>` with your actual numeric IDs. You can find these IDs in the Producer UI or in the browser address bar when viewing the Producer or Operator pages.

### Resolution

Set the Browser Source dimensions to match your workspace display configuration:

- **Width**: 1920 (or your workspace's `baseWidth`)
- **Height**: 1080 (or your workspace's `baseHeight`)

### Other settings

| Setting | Recommended |
|---------|-------------|
| FPS | 60 (matches most stream/broadcast setups) |
| Custom CSS | Leave blank (CeeGee handles all styling) |
| Shutdown source when not visible | Unchecked (keeps the WebSocket connection alive) |
| Refresh browser when scene becomes active | Unchecked (state syncs automatically via WebSocket) |

## Verifying the connection

Once the Browser Source is added:

1. Open the CeeGee Operator UI in your browser.
2. Take an element live.
3. You should see the graphic appear in OBS with a transparent background, composited over your video.

If you don't see anything:
- Check that CeeGee is running (`pnpm dev`).
- Verify the URL is correct (workspace and channel IDs match).
- Check the Operator UI's connection status indicator.
- Try right-clicking the Browser Source in OBS and selecting **Refresh**.

## Typical setups

### Single channel

The simplest setup: one Browser Source pointed at one channel.

```
OBS Scene
├── Video Source (camera, capture, etc.)
└── Browser Source → /o/1/channel/1
```

All layers within the channel render together in z-index order. This is sufficient for most shows.

### Multi-layer composition

For advanced control, use separate Browser Sources per layer. This lets you independently position and transform layers in OBS.

```
OBS Scene
├── Video Source
├── Browser Source → /o/1/layer/3  (Full Screen, z=10)
├── Browser Source → /o/1/layer/2  (Lower Thirds, z=20)
└── Browser Source → /o/1/layer/1  (Bugs, z=30)
```

Stack the Browser Sources in OBS in the same z-index order as your CeeGee layers.

### Multi-channel

Use separate channels for different outputs (e.g., main program vs. social media feed).

```
OBS Scene "Main"
└── Browser Source → /o/1/channel/1

OBS Scene "Social"
└── Browser Source → /o/1/channel/2
```

## Network setup

CeeGee runs on your local machine by default (`localhost:3000`). If OBS is on a different machine:

1. Start CeeGee with the host bound to your network interface (or `0.0.0.0`).
2. Use the machine's IP address in the Browser Source URL (e.g., `http://192.168.1.100:3000/o/1/channel/1`).
3. Ensure both machines are on the same network and the port is not blocked by a firewall.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Black screen in OBS | Verify the URL is correct and CeeGee is running |
| Graphics not updating | Check WebSocket connection; try refreshing the Browser Source |
| Wrong resolution | Match Browser Source dimensions to workspace display config |
| Laggy animations | Increase OBS Browser Source FPS to 60; check system resources |
| Transparent background not working | Ensure no custom CSS is set on the Browser Source |
