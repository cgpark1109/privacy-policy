# Flag Quiz and Capital Quiz (browser games)

Sources for `play/flag-quiz/` and `play/capital-quiz/`, the browser versions of the Flutter apps
flag_challenge and capitalcity_challenge (not on Google Play yet). Unlike the other games under `play/`,
these are not copied from a separate web repo by `sync_webapps.py`: they are generated here.
This folder starts with `_`, so GitHub Pages (Jekyll) does not publish it.

## Files

| File | What it is |
| --- | --- |
| `countries.json` | Master dataset: 195 countries (193 UN members + Vatican City + Palestine), one per line. Edit this. |
| `games.mjs` | Per-game settings and text (titles, descriptions, modes, prompts) in English and Korean. |
| `shared/app.js`, `shared/logic.js`, `shared/style.css` | The engine, rules and stylesheet shared by both games (copied into each game). |
| `build.mjs` | Writes both games: `index.html`, the list page, `game.js`, `data.js`, the shared files, `favicon.svg`, `LICENSE-flags.txt`, `flags/*.svg`. |
| `make_images.mjs` | Renders `og-image.png` and `apple-touch-icon.png` with headless Edge/Chrome (committed outputs). |
| `cldr_names.mjs` | Compares the Korean country names with CLDR (`Intl.DisplayNames`) and the reviewed overrides; `--write` refills them. |
| `check_data.mjs` | Data checks (membership, names, capitals, levels, the apps' 75, wrong choices, flags, file sizes and names). |
| `test_logic.mjs` | Tests for stars, unlocking, progress and choice rules in `shared/logic.js`. |
| `linkcheck.mjs` | Fetches every page and asset of both games from a local server; fails on 404s and stray root-absolute paths. |

## Regenerate

From the repository root:

    node _src/webgames/build.mjs            # both games (flags from the local pub cache, see below)
    node _src/webgames/make_images.mjs      # only when titles, counts or the look change
    node _src/webgames/cldr_names.mjs       # Korean names vs CLDR (report)
    node _src/webgames/check_data.mjs
    node _src/webgames/test_logic.mjs
    python -m http.server 8931              # in another terminal
    node _src/webgames/linkcheck.mjs http://localhost:8931

Then `python _src/build.py` as usual if the site's game list changes (not needed for edits inside the games).

Flags: the 4:3 SVGs of [flag-icons](https://github.com/lipis/flag-icons) (MIT) as bundled by the Dart package
`country_flags` 4.1.2, read from `%LOCALAPPDATA%/Pub/Cache/hosted/pub.dev/country_flags-4.1.2/res/svg`
(`--flags-from <dir>` to use another copy). Serbia comes from the `flag` 7.0.2 package (same design, a quarter of
the size). Syria is redrawn at 4:3 in `build.mjs` (the bundled 2025 flag is 3:2). Whitespace is removed and, in
files over 100 kB with absolute coordinates, numbers are rounded to one decimal. If the pub cache is missing,
the build reuses the flags already in `play/flag-quiz/flags/`.

## Dataset notes

- `level` / `levelGroup`: Flag Quiz levels, 5 countries each, 39 levels. Levels 1–15 are the apps' 75 countries in
  the apps' order; levels 16–39 add the other 120 from familiar to obscure. `levelGroup` = `level`, as in the apps.
- `capitalLevel`: Capital Quiz levels. Israel and Palestine are left out (`capital: null`) because their capitals
  are disputed internationally. Jordan fills Israel's place in level 9; the rest follow the master order, 5 per
  level; the last 3 countries join level 38, which therefore has 8 (5 are asked per play, like every level).
- Wrong choices come from the same level group (the rule in the apps' data). In the Flag Quiz, look-alike flags
  (`lookalikes`, always mutual) may replace some of them: none in levels 1–5, one in levels 6–15, two from level 16.
- `name.ko` comes from CLDR with the overrides listed in `cldr_names.mjs`; the CLDR form stays searchable in `aliases.ko`.
- `capital.ko`: standard Korean exonyms, written by hand. `capitalNote` explains countries with more than one
  capital (or a largest city that is not the capital); the English note may be empty when the note is only about the Korean name.
- `the: true`: English sentences say "the United States", "the Netherlands"...
- `region`: UN M49 continents, with the Americas split into North America (incl. Central America and the Caribbean)
  and South America.

## Progress and settings

Saved in `localStorage` under `kys_flag_progress` / `kys_flag_settings` and `kys_capital_progress` /
`kys_capital_settings` (the origin is shared by all games on the site). Progress per mode: highest unlocked level and best
stars per level, as in the apps' `progress_service.dart`.

Ads: none. The result screen has an empty, hidden `<div class="ad-slot" data-ad-slot="result" hidden>` hook for later.
