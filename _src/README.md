# Site source

The pages at the repository root (index.html, ko/, games/, news/, about/, support/, 404.html,
sitemap.xml, robots.txt) are generated. Edit `content.py` (text in English and Korean, games, news,
FAQ) or `../assets/site.css`, then from the repository root run:

    python _src/build.py

Adding a game: add an entry to `GAMES` in content.py and its Play screenshot URLs to
`screenshots.json`. News entries with `"draft": True` stay off the site. Game pages get a
"scan to install" QR code (drawn by `qr.py`, shown to desktop visitors only) and structured data.

Privacy policies: privacy.html (English) and ko/privacy/index.html (Korean). The policy text between
`<!-- policy:start -->` and `<!-- policy:end -->` is edited by hand (the build keeps it as is); the build
regenerates the site header, footer and game list around it. Keep the two languages in step.
Terms of Service (terms/, ko/terms/) and the About page are generated from TERMS and ABOUT in content.py.

Hangul guides (/learn/, English only): one file per article in `_src/learn/<slug>.html`. Each starts with an
HTML comment holding JSON metadata (title, description, date, optional updated, order) followed by the article
HTML. Write `{{say:한글}}` to add a listen button that reads the Korean with the browser's voice. The guide list,
reading time, previous/next links, sitemap entries and Article structured data are generated.
Game page guides (how to play, tips, FAQ) live in GUIDES in content.py.

World history reading (/ko/history/, Korean only): one file per article in `_src/history/<slug>.html`, in the same
format as the Hangul guides. It appears in the Korean menu and on the Korean home page. Set each article's
"order" to the year it is about, so the series lists in date order.

sitemap.xml lastmod: each build hashes every page in the sitemap (ignoring the stylesheet version and the footer's
site-wide date) and compares it with `_src/lastmod.json`. Pages whose content changed get today's date; the rest keep
their recorded date. Commit `_src/lastmod.json` together with the rebuilt site.

Browser games: `play/<slug>/` (except the generated list page `play/index.html`) are copies of the
web repos korean_word_quiz_web, korean_challenge_web and world_history_quiz_web, with their
github.io URLs rewritten to this domain. Don't edit them here: change the web repo, push it, then run

    python _src/sync_webapps.py
    python _src/build.py

`webapps.json` records which commit of each web repo is copied. The github.io versions stay online
(the Learn Korean app reads korean_challenge_web/notice.json there), so when that notice changes,
re-sync so the copy on this site shows the same notice.

Not generated, edit by hand: privacy-policy/ (an older copy of the policy kept for old app listings,
marked noindex), app-ads.txt, ads.txt, CNAME.
AdSense: every page carries the google-adsense-account tag (STUDIO["adsense"] in content.py; sync_webapps.py
adds it to the web games). ads.txt and app-ads.txt hold the same publisher line.
GitHub Pages (Jekyll) does not publish folders starting with "_", so this folder stays private.

## History Timeline (browser game)

`/play/history-timeline/` is built by `python _src/build.py` (through `_src/timeline_build.py`): one event per
article in `_src/history/`, listed in `_src/timeline.py` (year range, display year and card label in Korean and
English, and whether it belongs to the Korean history deck). The game script and styles are `_src/timeline/app.js`
and `_src/timeline/extra.css` (appended to the shared web game stylesheet). After changing the look, run
`node _src/timeline/make_images.js` to redraw `og-image.png` and `apple-touch-icon.png`. When you add history
articles, add their events to `_src/timeline.py` and update the event counts ("83") in `_src/content.py`.
