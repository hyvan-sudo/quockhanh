# 🇻🇳 Who's the Impostor? — 2/9 Special Edition

A realtime, up-to-7-player party game built with **React + Vite + TypeScript + Tailwind + Firebase Realtime Database**.

6 players get the same secret English word. 1 player (the Impostor) gets a different but
related word. Everyone answers a question about their word, discusses, votes, and the
Impostor tries to survive detection. After 5 rounds, the top scorer gets first spin (and
an extra spin) on the 🎰 Gacha 2/9 wheel.

---

## 1. How to run locally

**Requirements:** Node.js 18+ and npm.

```bash
cd impostor-game
npm install
cp .env.example .env.local   # then fill in your Firebase values (see step 2)
npm run dev
```

This starts Vite on `http://localhost:5173`. It also prints a **Network** URL
(e.g. `http://192.168.x.x:5173`) — use that URL on players' phones/laptops as
long as they're on the same Wi-Fi, so you don't need to deploy anything to
test with real devices.

---

## 2. Configuring Firebase

1. Go to the [Firebase console](https://console.firebase.google.com/) → **Create project**
   (a free "Spark" plan project is enough).
2. In the project, go to **Build → Realtime Database → Create Database**.
   - Pick any region.
   - Start in **locked mode** — we'll paste in our own rules in step 4.
3. Go to **Build → Authentication → Get started → Sign-in method** and enable
   **Anonymous** sign-in. (This is *not* email/password — no signup form is
   ever shown to players. It just gives each browser a stable, private ID so
   refreshing the page doesn't create a duplicate player, and so the Realtime
   Database can restrict each player to reading only their own secret word.)
4. Go to **Realtime Database → Rules**, and paste in the contents of
   `database.rules.json` from this project, then click **Publish**.
   - Or, using the Firebase CLI: `firebase deploy --only database` (see step 5).
5. Go to **Project settings → General → Your apps → Add app → Web (</>)**.
   Register the app (no need for Firebase Hosting at this step) and copy the
   `firebaseConfig` object it gives you.

### Which environment variables are needed

Copy `.env.example` to `.env.local` and fill in the values from the
`firebaseConfig` object Firebase gave you:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.<region>.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

`VITE_FIREBASE_DATABASE_URL` is important — it's shown on the Realtime
Database page itself, not always in the default web-app config snippet.

---

## 3. How the "secret" system actually works (read this once)

There's no backend server — everything runs client-side against Firebase RTDB,
per your "keep it simple" requirement. To still keep the Impostor's identity
and the two secret words hidden from other players, secret data lives in a
**separate top-level branch**, `/secrets/{roomCode}/...`, not nested inside
`/rooms/{roomCode}`. This matters because Firebase RTDB read rules cascade
downward — nesting secrets under the public room object would make any
nested "restriction" meaningless, since the broader rule already grants
access to everything beneath it. Keeping `/secrets` as a sibling branch with
its own rules avoids that trap:

- `/secrets/{code}/players/{uid}` (your word, whether you're the impostor,
  your optional end-of-round guess) — only readable by that player, until
  the round reaches "reveal", at which point it opens up for everyone (since
  it's no longer secret at that point).
- `/secrets/{code}/round` (the main word, impostor word, impostor's player
  id) — only readable once the room's phase is "reveal" or later.

**Honest caveat:** this is genuinely enforced by Firebase's rules engine
(not just hidden in the UI), which is a meaningful step up from "just don't
render it." But since there's no backend and *write* access to `/secrets` is
kept open to any authenticated player (to avoid fragile host-only write
rules breaking round transitions), a determined player who opens their
browser's dev console could theoretically tamper with data. For a trusted
group of friends at a National Day party, that's an acceptable trade-off —
if you ever wanted airtight server-authoritative secrecy, you'd move round
setup and scoring into a Cloud Function, which was intentionally left out
here to keep this buildable in ~2 hours.

---

## 4. Deploying

### Option A — Firebase Hosting (recommended, free, matches your Firebase project)

```bash
npm install -g firebase-tools
firebase login
firebase init
# - Choose "Hosting" and "Realtime Database"
# - Use an existing project → pick the one you created
# - Public directory: dist
# - Configure as single-page app: Yes
# - Don't overwrite index.html
npm run build
firebase deploy
```

This deploys both your built app and `database.rules.json` in one shot.
Firebase prints a `https://your-project.web.app` URL — that's what you share
with players on the day.

### Option B — Vercel / Netlify

Both work fine for a static Vite build:

```bash
npm run build
```

Deploy the `dist/` folder, and set the same `VITE_FIREBASE_*` environment
variables in the host's dashboard (Vercel/Netlify project settings) before
building, since Vite bakes `import.meta.env.VITE_*` values in at build time.

---

## 5. Testing with 7 players (before the event)

You don't need 7 devices to test the full flow:

1. Run `npm run dev`.
2. Open the app in **7 separate browser tabs** — but use **incognito/private
   windows** (or 7 different browser profiles) for at least 6 of them.
   Regular tabs in the *same* browser profile all share the same Firebase
   Anonymous Auth session, so they'd all be treated as the *same* player.
   Incognito windows (or different browsers: Chrome, Firefox, Edge, Safari,
   etc.) each get their own anonymous auth identity.
3. In tab 1: **Create Room**, enter a name — you're the host.
4. In tabs 2–7: **Join Room** with the 6-character code, each with a
   different name.
5. Back in tab 1 (host), click **Start Game** once you have 3–7 players.
6. Walk through: secret word → ready → answer the question → 60s discussion
   → vote (20s, or let it time out to test the auto-random-vote fallback) →
   reveal → next round, for all 5 rounds.
7. At the final screen, click **Continue to Gacha** (host only) and spin
   through the order — the 1st-place player should get 2 turns.
8. **Refresh one of the tabs mid-round** to confirm it rejoins the same
   player (same name, same score, same current phase) instead of creating a
   new player or resetting the game.
9. **Close a non-host tab** to simulate a disconnect — the player list
   should show them as offline without removing them or blocking the round
   from continuing (the round-completion checks only wait for a player if
   they're still present in `room.players`, and votes/answers still lock in
   normally for everyone still connected — a genuinely stuck round can
   always be pushed forward by the discussion/voting timers).

Tip: since the host tab drives the discussion/voting countdown expiry, keep
the host's tab/browser open and awake throughout the party (don't let the
laptop sleep). Every other client-triggered step (answers, votes, ready-up)
works from any tab, with race conditions guarded by Firebase transactions.

---

## Project structure

```
src/
  data/            keyword pairs, questions, gacha slots (static, local data)
  hooks/            usePlayerId — anonymous-auth based stable player id
  lib/              room.ts (game flow/state machine), gacha.ts (spin logic)
  components/       one component per game phase (SecretWord, Voting, Reveal, ...)
  pages/            Landing, Lobby, GameRoot (phase router), FinalRanking, GachaScreen
  types.ts          shared TypeScript types matching the Firebase data shape
database.rules.json Firebase Realtime Database security rules
```

## What was intentionally left out (per your simplicity requirements)

No accounts/passwords, no voice chat, no payment integration, no AI-generated
questions, no multi-room-per-player support, no 3D. Keyword pairs, questions,
and gacha messages are static local data, not fetched from anywhere.
