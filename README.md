# GymRadar

A personal dashboard for deciding which of your favorite gyms to visit today or right now.

**Personal preference > crowd level > travel time > weather.** GymRadar recommends your
highest-priority gym that isn't confirmed closed or unsuitable for your planned workout.
Crowd level, travel time and weather are shown as context. They never reorder your ranking.

## Running it

Astro renders the page on the server for every request (Node adapter), and the dashboard UI is
React with [shadcn/ui](https://ui.shadcn.com), Tailwind CSS and lucide icons.

```sh
pnpm install
pnpm dev        # English at http://localhost:4321, Japanese at http://localhost:4321/ja/
```

The page is light by default. The moon button switches to dark mode, and the browser remembers
the choice.

| Command | Action |
| :-- | :-- |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm astro check` | Type-check |
| `pnpm build` then `node dist/server/entry.mjs` | Production server (Node adapter, rendered per request) |

## Configuring your gyms

Edit `src/config/gyms.ts`. **The order of the list is your priority order.** The file ships with
example gyms. Replace them with your own.

For each gym:

- `nameJa` (optional): the name shown on the Japanese page; `name` is used otherwise.
- `konamiFacilityCode`: from the official page URL, e.g. `…/ksc/004446/`.
- `coordinates`: used for weather only.
- `travel`: your usual door-to-door time and mode. GymRadar doesn't compute routes; the card links
  to Google Maps directions.
- `areas`: each workout area the gym has (`gym`, `pool`), with its last-use time in minutes before
  closing, copied from the 営業時間 notes on the official page. Leave out areas the gym doesn't have.

`defaultWorkout` sets your usual area and duration. The form at the top of the dashboard changes
them for one visit, e.g. `/?area=pool&duration=45&depart=19:00`.

## How a recommendation is made

1. **Today's official schedule** for each gym comes from its Konami page: the special-hours
   table, then the two-month business calendar, then the regular hours. On public holidays the
   holiday (祝休日) hours apply. A day counts as open only when an official source gives hours
   for it.
2. **Exclude** gyms that are confirmed closed or can't fit the workout: closed today, closed by
   the time you'd arrive, missing the area, or the area's last-use time leaves too little time.
3. **Recommend the highest-ranked remaining gym.** If its status can't be confirmed (the official
   page failed to load, a calendar notice GymRadar can't interpret, or Konami's live status
   contradicting the schedule), it keeps its place but is flagged "check before going". The
   highest-ranked *confirmed* gym is named as well.

Every recommendation comes with an explanation that names the excluded gyms and why. It also says
when occupancy data was missing or stale.

## Languages

All visible text, including the explanations, comes from the message catalogs in `src/i18n/`.
`en.ts` is the reference; `ja.ts` must match its shape (TypeScript enforces this), and a test fails
if any fixed Japanese string is left untranslated. The domain logic passes data, not English
fragments, to the catalogs, so each language can word whole sentences naturally.

## Data sources

- **Konami facility pages** (public HTML, not an API): occupancy (館内利用状況), hours, calendar,
  special hours and notes, all from one request per gym, cached for 5 minutes. Occupancy is
  calculated from check-ins on a 3-level scale and appears to update about every 30 minutes.
  Readings older than 60 minutes are marked stale, and closed gyms show occupancy as "Not
  applicable". The investigation behind this is in [docs/konami-data-sources.md](docs/konami-data-sources.md).
- **Public holidays**: the Cabinet Office list, vendored in `src/lib/holidays.ts` for 2026–2027.
  Add the next year when it's published each February. Dates outside the list show as unconfirmed.
- **Weather**: [Open-Meteo](https://open-meteo.com) (no API key).

## Limitations

- Konami can change its page markup at any time. The parser reports anything unexpected as
  unknown instead of guessing.
- The occupancy widget's business-hours format was confirmed live on 2026-11-07, but its behaviour
  right after opening and at closing hasn't been observed. If it lags at opening, the gym briefly
  shows "Conflicting signals".
- Hours changes announced only in news posts are listed on the card but not interpreted.
- Area last-use rules are configured by hand. Pool closures for kids' classes aren't modelled.
- Only Konami Sports Club pages using the standard template are supported. Grancise and
  school-only facilities aren't.
- Test fixtures in `src/lib/fixtures/` are copies of public Konami pages saved on 2026-11-03 and 2026-11-07.
