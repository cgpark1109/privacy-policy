# Site source

The pages at the repository root (index.html, ko/, games/, news/, about/, support/, 404.html,
sitemap.xml, robots.txt) are generated. Edit `content.py` (text in English and Korean, games, news,
FAQ) or `../assets/site.css`, then from the repository root run:

    python _src/build.py

Adding a game: add an entry to `GAMES` in content.py and its Play screenshot URLs to
`screenshots.json`. News entries with `"draft": True` stay off the site. Game pages get a
"scan to install" QR code (drawn by `qr.py`, shown to desktop visitors only) and structured data.

privacy.html: the policy text between `<!-- policy:start -->` and `<!-- policy:end -->` is edited by
hand (the build keeps it as is); the build regenerates the site header, footer and game list around it.

Browser games: `play/<slug>/` (except the generated list page `play/index.html`) are copies of the
web repos korean_word_quiz_web, korean_challenge_web and world_history_quiz_web, with their
github.io URLs rewritten to this domain. Don't edit them here: change the web repo, push it, then run

    python _src/sync_webapps.py
    python _src/build.py

`webapps.json` records which commit of each web repo is copied. The github.io versions stay online
(the Learn Korean app reads korean_challenge_web/notice.json there), so when that notice changes,
re-sync so the copy on this site shows the same notice.

Not generated, edit by hand: privacy-policy/, app-ads.txt, ads.txt, CNAME.
AdSense: every page carries the google-adsense-account tag (STUDIO["adsense"] in content.py; sync_webapps.py
adds it to the web games). ads.txt and app-ads.txt hold the same publisher line.
GitHub Pages (Jekyll) does not publish folders starting with "_", so this folder stays private.
