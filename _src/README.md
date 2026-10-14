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

Not generated, edit by hand: privacy-policy/, app-ads.txt, CNAME.
GitHub Pages (Jekyll) does not publish folders starting with "_", so this folder stays private.
