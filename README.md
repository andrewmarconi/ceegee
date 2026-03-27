![CeeGee](apps/engine-ui/public/ogimage.jpg)

# CeeGee

A self-hosted **HTML graphics engine** and **web control UI** for broadcast-style overlays. Built with Nuxt 4, Vue 3, and GSAP.

Outputs transparent HTML overlays for OBS Browser Source. Operator UI controls what's on air. Producer UI manages the content. WebSocket keeps everything in sync.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), create a workspace, and start building graphics.

| URL | What it does |
|-----|-------------|
| `/app` | Workspace dashboard |
| `/app/:id/producer` | Manage channels, layers, elements |
| `/app/:id/operator` | Live TAKE/CLEAR control |
| `/o/:id/channel/:id` | OBS Browser Source overlay |

## Tests

```bash
pnpm test
```

## License

MIT
