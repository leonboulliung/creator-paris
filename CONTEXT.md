# Creator.Paris — Aktueller Stand (Briefing für GPT-Session)

**Stand:** 26. Mai 2026
**Repo:** github.com/leonboulliung/creator-paris (branch: main)
**Prod:** creator-paris.vercel.app
**Owner:** Leon Boulliung

---

## 1. Mission & Tonalität

Living city-layer Web-App für Paris. Jeder Nutzer postet **genau eine** aktive Karte pro Woche (Einladung, Spaziergang, Filmabend, Pickup-Match, Kuration …) mit einem echten Pin auf der Paris-Karte. Ziel: kulturelle Entwicklung in Paris durch kleine, sich überlagernde menschliche Momente beschleunigen.

Tonalität: editorial Schwarz-Weiß-Minimal (Inter + JetBrains Mono), Polymarket/Craigslist-Energie, mobile-first, mit echter Paris-Uhrzeit und prozeduralem visuellen Feel.

---

## 2. Stack

- **Next.js 14** (App Router), React 18, TypeScript, Tailwind CSS
- **Clerk** (`@clerk/nextjs ^6.39.4`) — Email-OTP (Phone OTP verworfen, weil Clerk Production für DE-Nummern Paid-Plan verlangt)
- **Supabase** (Postgres + RLS + Realtime) — Projekt-Ref `zpkgofpkksetnbuizvhi`
- **Leaflet** + `leaflet-gesture-handling`
- **CARTO Positron** Tiles (`light_nolabels` Base + `light_only_labels` Overlay)
- **SunCalc** — astronomische Tageszeit für Paris
- **Komoot Photon** — Geocoder (frei, EU-hosted, kein API-Key)
- Hosting: **Vercel** (Hobby)

---

## 3. Datenmodell (Supabase)

| Tabelle | Felder (gekürzt) |
|---|---|
| `profiles` | id (= Clerk user id), display_name, avatar_url, bio, socials JSONB `{instagram, telegram, whatsapp, site}`, interests text[], username_changed_at, updated_at |
| `cards` | id, owner_id → profiles, **kind `idea\|thing`** (default thing), title, description, tags text[], color, location JSONB nullable, spots int nullable, permission nullable, expires_at (=start) nullable, ends_at, external_url, archived bool, created_at |
| `joiners` | card_id, user_id, role, joined_at — Owner ist auto-joiner mit `role="creator"` |
| `join_requests` | card_id, user_id, requested_at |
| `signals` | card_id, user_id, created_at — Resonanz auf eine **Idee** (leichter als joiners) |
| `follows` | follower_id, following_id, created_at — Folgen; speist die „FOLLOWING"-Sektion im Feld |

**Regeln:**
- Zwei Objektarten auf `cards`: **Idee** (billig, Text reicht, sammelt Signale) und **Sache** (konkret, joinbar). Transform Idee→Sache flippt `kind` in-place (siehe `/api/cards/[id]/transform`), Signalgeber werden zu warmer Crew (`join_requests`).
- Genau 1 *Sache* aktiv pro User. Beim POST wird die vorherige auto-archived. Ideen dürfen viele gleichzeitig schweben.
- "Aktiv" = `!archived AND expires_at > now AND joiners.length < spots`
- `starts_at` muss in `[now+5min, now+30d]` liegen
- Andere Joiner-Rollen sind vom Creator custom-benennbar
- RLS auf allen Tabellen; Schreibzugriff nur über `supabaseAdmin()` in API-Routes mit Clerk-`auth()`-Validierung

---

## 4. Architektur (Dateibaum)

```
app/
  page.tsx              Home: Map als primäre Surface, FeedPanel docked
  carnet/page.tsx       Eigenes Profil — Tabs: TRACK RECORD + CARNET (Poster)
  u/[id]/page.tsx       Öffentliches Profil (read-only)
  post/[id]/page.tsx    Card-Detailseite + Crew + Edit-Modal
  onboarding/page.tsx   2-Schritt-Onboarding (username+avatar → socials+interests)
  api/cards/route.ts                          POST neue Card (auto-archive)
  api/cards/[id]/route.ts                     PATCH/DELETE eigene Card
  api/cards/[id]/join/route.ts                POST join / DELETE leave
  api/cards/[id]/joiners/[userId]/route.ts    PATCH role (nur Owner)
  api/cards/[id]/requests/[userId]/route.ts   PATCH accept / DELETE reject
  api/profile/me/route.ts                     GET/POST/PATCH eigenes Profil

components/
  Header.tsx            Logo + Uhr/TOD + PROFILE/PARIS-Switch
  ParisMap.tsx          Leaflet, Custom-Pins, Hover-Tooltip + Click-Preview
  FeedPanel.tsx         Permanent docked Feed (rechts/desktop, unten/mobile)
  CardCreate.tsx        Composer — Desktop Sidebar+Map, Mobile Modal
  CardItem.tsx          Feed-Listeneintrag
  Constellation.tsx     Inline Leaflet für Carnet-Poster (mit Polylinie)
  ProfileEditor.tsx     Modal: username, socials, interests

lib/
  db.ts                 Supabase-Queries, snake_case↔camelCase Mapping
  realtime.ts           useRealtimeCards Hook
  supabase.ts           Browser-Client + supabaseAdmin() (safeCreate Pattern!)
  server/profile.ts     ensureProfile() — lazy Clerk→Supabase upsert
  vibe.ts               TOD-Logik (SunCalc) + ACTIVITY_LABEL, TOD_LABEL
  time.ts               Paris-Time, parisTimeOfDay(), buildWhenChips()
  color.ts              cardColor, categoryColor, isDark
  share.ts              PNG-Poster-Export (Canvas + gestitchte CARTO-Tiles)
  location.ts           Photon-backed Combined-Search (debounce 220ms)
  quartiers.ts          PARIS_CENTER, PARIS_BOUNDS, Quartier-Presets
  hooks.ts              useMediaQuery, useIsDesktop (min-width: 900px)
```

---

## 5. UI-Konventionen

- **LEITPRINZIP — wenig Plattform-Text.** Wenn der von Menschen erstellte Inhalt
  (Idee/Sache, Titel, Crew) das Kern-CTA ist, darf so gut wie kein anderer
  Plattform-Text drumherum sein. Keine Labels/Untertitel/Counts, die nur erklären
  was ohnehin sichtbar ist (z.B. „HAPPENING", „JOIN A CREW", „0◦ 1●", redundante
  Uhr/Stadt). Icons statt Wörtern, wo ein Icon eindeutig ist (Uhr = Zeit, Pin =
  Ort). Gilt für die ganze App.
- **App-Shell**: `.app-shell = h-100dvh flex flex-col`, Header `shrink-0`, Main `flex-1 min-h-0 overflow-y-auto` (`no-scroll`-Variante für volle Map). iOS via `env(safe-area-inset-*)`.
- **Map ist Primär.** Auf jedem Viewport ist die Paris-Karte die Haupt-Surface. Keine separate Feed-Seite mehr.
- **FeedPanel ist permanent gedockt** (nie unsichtbar):
  - Desktop rechts: **380 px** expanded / **52 px** Collapsed-Vertikal-Tab mit gedrehter Schrift "n ACTIVE · OPEN LIST"
  - Mobile unten: **85dvh** expanded / **52 px** Peek-Strip (Clock · TOD · n ACTIVE · OPEN ↑)
  - Default: expanded auf Desktop, peek auf Mobile
- **Header**: Logo + Live-Uhr + TOD-Label + PROFILE/PARIS-Switch. Kein FEED/MAP-Toggle, kein Ticker mehr.
- **+ ONE THING FAB**: bottom-right, shiftet `translateX` weg vom Panel (Desktop) bzw. liftet 52 px nach oben (Mobile). Hidden während Mobile-Sheet expanded.
- **Pins** (`.cp-pin`): single-color Radar-Pulse + weißer Halo, CSS-Grid `place-items: center` für sub-pixel-saubere Mitte.
- **Pulse-Dot im Logo** (`.cp-pulse-dot`): identische Optik wie Map-Pin.

---

## 6. Tageszeit-System (TOD)

`parisTimeOfDay()` (SunCalc) liefert: `dawn | morning | midday | golden | evening | night`. `.cp-map[data-tod="…"]` setzt CSS-Filter auf `.leaflet-tile-pane`:

| TOD | BG | Filter-Charakter |
|---|---|---|
| dawn | `#f7d8c0` | sepia 0.42, sat 1.25 — warmer Pfirsich |
| morning | `#e9eef3` | kühl-klar |
| midday | `#f4f4f0` | sat 0.55 — gebleicht-editorial |
| golden | `#edc488` | sepia 0.55 — honey wash |
| evening | `#d4a2c4` | hue-rotate -30°, sat 1.4 — dusky pink-purple |
| night | `#0a1424` | inverted dark navy |

---

## 7. Feature-Status

**Funktioniert & deployed:**
- Email-OTP Sign-up / Sign-in
- Onboarding (2-Schritt)
- Card erstellen mit Color / Category / Spots / When-Picker (Chips + Datetime) / Location (Photon)
- Map mit Live-Pins, Hover-Tooltip + Click-Preview (mutually exclusive)
- Realtime Card-Updates via Supabase
- Track Record (Created + Joined)
- Carnet-Poster mit PNG-Export
- Profile-Editor (username, socials, interests)
- Öffentliches Profil `/u/[id]`
- Custom-Roles für Joiner durch Creator
- Public-Join vs. Request-Permission
- Auto-Archive der vorherigen Card
- Astronomische TOD-Tints auf der Karte
- Docked FeedPanel mit expand/collapse

**Bewusst NICHT vorhanden:**
- AI / LLM
- Push Notifications
- Payments / Pricing
- Admin-Backend / Ban-System
- Wetter-Overlay (offene Idee, nicht gebaut)
- Separate Feed-Seite (entfernt)

---

## 8. Skalierung

Aktuell alle Free-Tier:

| Layer | Limit | Bei 100 WAU | Status |
|---|---|---|---|
| Vercel Hobby | 100 GB Bandwidth | <1 GB/Tag | ✅ |
| Clerk Free | 10 000 MAU | 1 % | ✅ |
| Supabase Free | 500 MB DB / 2 GB Egress / 200 conc. Realtime | ⚠️ Egress kann an 2 GB kommen | 🟡 |
| CARTO Tiles | "low-traffic" ToS-Graubereich | OK technisch, juristisch unklar | 🟡 |
| Photon | fair-use | trivial | ✅ |

Echter Bottleneck nahe Limit: 60-Sekunden-Polling-Refetch pro offenem Tab. Sollte auf `visibilitychange` reduziert werden — Realtime allein würde reichen.

Architektur ist von Natur aus schlank: keine AI, kein serverseitiges Image-Processing, keine Background-Jobs.

---

## 9. Security / Sensible Punkte

- `CLERK_SECRET_KEY`, Supabase `service_role` — strikt server-only (`lib/server/*`, API-Routes)
- Username-Regex: `/^[a-z0-9][a-z0-9._-]{1,31}$/i`
- Social-Handle-Sanitization: führendes `@` strippen; URL muss `^https?://` matchen
- Interests gegen Whitelist
- RLS aktiv; Writes nur über `supabaseAdmin()` nach Clerk-`auth()`-Check
- Supabase service-role Key ist einmal versehentlich im Chat gelandet — rotieren steht aus

---

## 10. Wichtige Architektur-Entscheidungen / Quirks

- **Phone OTP → Email OTP** wegen Clerk-Paywall für DE-Nummern
- **localStorage → Supabase** für shared state + Realtime
- **Separate /feed Seite entfernt** — Map permanent primary
- **Header-Ticker entfernt** — FeedPanel kommuniziert Activity klarer
- **TOD via SunCalc** statt fester Stunden
- **`lib/supabase.ts safeCreate`-Pattern**: try/catch-Fallback ist user-modifiziert — **nicht reverten**
- **`next-env.d.ts`**: user-modifiziert — **nicht reverten**
- iOS Safari stacking-context-Bug → Composer rendert in `<main>`, nicht via Portal
- Leaflet `invalidateSize()` mehrfach mit Timeouts gegen Container-Resize-Race
- Realtime-Channels pro Mount mit unique Suffix gegen Collision
- Constellation map: `ready`-State in useEffect-Deps gegen async-Mount-Race
- ParisMap unterdrückt Tooltip-Reopen während Click-Preview offen ist

---

## 11. Konstanten / IDs

- Clerk App ID: `app_3E8egqn5OCm0jSRn1JB2g5KVMNZ`
- Supabase Project Ref: `zpkgofpkksetnbuizvhi`
- Paris-Bounds & Center: `lib/quartiers.ts` (Center ~ 48.8566, 2.3522)
- Desktop-Breakpoint: 900 px (`useIsDesktop`)
- FeedPanel: 380 / 52 px Desktop, 85dvh / 52 px Mobile
