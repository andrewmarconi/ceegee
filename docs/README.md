---
home: true
config:
  - type: hero
    full: true
    backgroundImage: /hero-bg.jpg
    hero:
      name: CeeGee
      tagline: Self-hosted broadcast graphics for everyone
      text: An open source HTML titling engine with a real-time web control surface. Build, control, and display broadcast-quality overlays from any browser.
      actions:
        - text: Get Started
          link: /user/getting-started/
          theme: brand
        - text: View on GitHub
          link: https://github.com/andrewmarconi/ceegee
          theme: alt

  - type: features
    title: Why CeeGee?
    description: A lightweight alternative to commercial broadcast graphics systems, designed for small and medium productions.
    features:
      - title: Self-Hosted
        icon: twemoji:house
        details: Runs entirely on your own hardware. No cloud dependency, no subscription, no vendor lock-in.
      - title: Real-Time Control
        icon: twemoji:high-voltage
        details: WebSocket-driven operator UI lets you take, clear, and edit graphics live with instant feedback.
      - title: OBS Ready
        icon: twemoji:movie-camera
        details: Drop an overlay URL into an OBS Browser Source and you're on air. Works with any tool that renders HTML.
      - title: Modular Graphics
        icon: twemoji:puzzle-piece
        details: Ships with lower thirds, bugs, billboards, clocks, and countdowns. Build your own with Vue and GSAP.
      - title: Producer + Operator
        icon: twemoji:clapper-board
        details: Separate views for building show structure and controlling live output, so each role gets exactly the UI they need.
      - title: Open Source
        icon: twemoji:unlocked
        details: MIT licensed. Read the code, extend it, contribute back. No black boxes.

  - type: features
    title: How It Works
    description: CeeGee follows a simple three-step workflow.
    features:
      - title: 1. Build
        icon: twemoji:artist-palette
        details: Use the Producer UI to create workspaces, channels, layers, and elements from built-in or custom graphic modules.
      - title: 2. Control
        icon: twemoji:control-knobs
        details: The Operator UI provides a live control surface to take and clear graphics on air, with real-time WebSocket sync.
      - title: 3. Display
        icon: twemoji:television
        details: Point any HTML-capable renderer — OBS Browser Source, a second monitor, or a web browser — at the overlay URL.

  - type: features
    title: Documentation
    description: Everything you need to run CeeGee or build on top of it.
    features:
      - title: User Guide
        icon: twemoji:open-book
        details: Installation, show setup, the operator interface, OBS integration, and the built-in modules reference.
        link: /user/
        linkText: Read the guide
      - title: Developer Guide
        icon: twemoji:hammer-and-wrench
        details: Architecture, engine internals, custom module development, testing strategy, and the WebSocket protocol.
        link: /developer/
        linkText: Start building
---
