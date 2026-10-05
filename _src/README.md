# Site source

The pages at the repository root (index.html, ko/, games/, news/, about/, support/, 404.html,
sitemap.xml, robots.txt) are generated. Edit `content.py` (text in English and Korean, games, news,
FAQ) or `../assets/site.css`, then from the repository root run:

    python _src/build.py

Adding a game: add an entry to `GAMES` in content.py and its Play screenshot URLs to
`screenshots.json`. News entries with `"draft": True` stay off the site.

Not generated, edit by hand: privacy.html, privacy-policy/, app-ads.txt, CNAME.
GitHub Pages (Jekyll) does not publish folders starting with "_", so this folder stays private.
