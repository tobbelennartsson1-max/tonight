# Tonight

Movie inspiration for Swedish streaming (Netflix, HBO Max, Disney+, Prime Video, Viaplay).
Vite + React + Tailwind. Routes: `/` landing, `/archive`, `/pick` (mood picker), `/today`
(Today's Pick), `/together` (watch together). UI in 7 languages (`src/i18n/`).

```bash
npm install
npm run dev        # web app on http://127.0.0.1:5173
npm run server     # Together realtime server on :8787 (proxied by Vite at /ws)
npm run build      # static build in dist/ (GitHub Pages friendly)
npm run extension:build   # regenerates extension/shared/* and ../tonight-extension.zip
```

## Watch together

Films are **not** streamed by Tonight (they're DRM-protected). Each person plays the film in their own
streaming app. Tonight handles everything around it:

- **Rooms**: `/together` → create a room (4-character code, link `/together/K7XQ`) or join by code.
  Everyone enters a name and ticks the services they have.
- **Shared services only**: suggestions and search only show films on a service *everyone* in the room
  has. The room shows which services you have in common, or says there are none.
- **Up next list** (main view on desktop): anyone can add films from search or the recommendations rail.
  Each item shows poster, title, service, IMDb score and who added it. Upvote to reorder, remove your
  own items, and use "Watch now" to move one to *Now playing*.
- **Swipe** (phones/touch only, `<768px` or coarse pointer): Tinder-style yes/no cards. When everyone
  in swipe mode says yes to the same film, it's a match. You get confetti and the film goes into the list.
- **Chat, reactions & effects**: emoji reactions float across everyone's screen. Confetti, hearts and
  popcorn can be triggered by anyone.
- **Start together**: a synced 3-2-1 "Press play!" countdown for everyone, based on the server clock
  (each client estimates its offset with ping/pong), with a link to the right service.
- **Presence**: who's online. Rooms are kept in memory and saved to `server/data/rooms.json`
  (rooms idle for 14 days are dropped).

### Server

`server/index.mjs`: plain Node + [`ws`](https://github.com/websockets/ws), no database.

| env | default | |
| --- | --- | --- |
| `PORT` | `8787` | HTTP/WebSocket port (`/health` returns JSON) |
| `ROOMS_FILE` | `server/data/rooms.json` | persistence file |

In dev, Vite proxies `/ws` → `ws://127.0.0.1:8787` (override with `WS_PROXY_TARGET`), so the web app
uses the same origin. For a hosted build, set **`VITE_WS_URL`** at build time, e.g.
`VITE_WS_URL=wss://tonight-together.onrender.com/ws npm run build`.

### Hosting (live)

- **Site:** GitHub Pages, built by `.github/workflows/deploy.yml`, which passes the repo variable
  `TONIGHT_WS_URL` in as `VITE_WS_URL`. If the variable is unset, `/together` shows a friendly
  "coming soon" card instead of trying to connect.
- **Realtime server:** Render web service `tonight-together` (free plan, Frankfurt), start command
  `node server/index.mjs` (`npm run start:server`), auto-deploys from `main`.
  - WebSocket: `wss://tonight-together.onrender.com/ws` · health check: `https://tonight-together.onrender.com/health`
  - Allowed origins: `https://tobbelennartsson1-max.github.io`, localhost/127.0.0.1, browser extensions,
    plus anything in the `ALLOWED_ORIGINS` env var (comma-separated).
  - Free instances **sleep after ~15 min idle**; the first connection then takes up to about a minute
    while it wakes (the app shows "connecting" and retries on its own).
  - Rooms live **in memory**, so a restart or redeploy empties them. People already in a room
    reconnect to the same code automatically (`resume`), but the queue and chat start over.

## Browser extension (Chrome / Edge, Manifest V3)

`extension/` adds an overlay with the room chat, floating reactions/effects and the synced countdown
on top of **netflix.com, play.max.com / hbomax.com, disneyplus.com, primevideo.com / amazon.*,
viaplay.se / viaplay.com**. The overlay is draggable, collapsible, uses Shadow DOM (site CSS can't clash)
and moves into the fullscreen element so it stays visible in fullscreen. It never controls the
site's player (no auto play/pause). Typing in the overlay doesn't trigger player shortcuts.

**Install (unpacked):**
1. Run `npm run extension:build` (or unzip `tonight-extension.zip`).
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and pick the `extension/` folder (or the unzipped folder).
4. Join a room: click the Tonight icon → enter room code + name, **or** on a Tonight room page click
   **Open overlay** (the room is handed to the extension).
5. Open your streaming service. The overlay appears on top of the player.

Server URL: extension options (default `wss://tonight-together.onrender.com/ws`; for local dev use
`ws://127.0.0.1:5173/ws` (Vite proxy) or `ws://127.0.0.1:8787/ws`). The WebSocket lives in the service worker, so streaming sites' CSP doesn't block it.
Extension strings come from the same `src/i18n` dictionaries (all 7 languages). Pick a language in the popup.
