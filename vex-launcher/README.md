# Vex Launcher

Desktop launcher for Vex, built with Electron, Vite, React, and TypeScript.

## Requirements

- Node.js 20 or newer
- npm
- Java installed locally for launching Minecraft

## Setup

```bash
npm install
```

Microsoft sign-in needs an Azure public client id:

```bash
export VEX_MS_CLIENT_ID="your-client-id"
```

The redirect URI expected by the launcher is:

```text
http://127.0.0.1:25585/callback
```

## Development

```bash
npm run dev
```

To open Electron DevTools during development:

```bash
VEX_OPEN_DEVTOOLS=1 npm run dev
```

## Quality Checks

```bash
npm run typecheck
npm run build
```

## Project Shape

- `src/main` contains Electron main-process code, launcher services, auth, profiles, settings, mods, and Minecraft file handling.
- `src/preload` exposes the safe renderer bridge.
- `src/renderer` contains the React app.
- `src/shared` contains contracts used by more than one process.
