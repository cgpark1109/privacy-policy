# Builds the studio site (English at /, Korean at /ko/) from content.py.
# Run from the repository root: python _src/build.py
# Jekyll on GitHub Pages skips folders starting with "_", so _src stays private.
import html
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from content import ABOUT, FAQ, GAMES, NEWS, STUDIO, UI  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = json.load(open(os.path.join(os.path.dirname(__file__), "screenshots.json"), encoding="utf-8"))
LANGS = ["en", "ko"]
PREFIX = {"en": "", "ko": "/ko"}
e = html.escape

ICON_YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'
ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>'
ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 1.8 14 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1zm11.5 11.3 2.6 2.6-12 6.9 9.4-9.5zm3.6-3.6 3 1.7c.8.5.8 1.6 0 2.1l-3 1.7-2.8-2.9 2.8-2.6zM5.7 1.4l12 6.9-2.6 2.6-9.4-9.5z"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'


def url(lang, path=""):
    return f"{PREFIX[lang]}/{path}" if path else f"{PREFIX[lang]}/"


def play_url(game):
    return f"https://play.google.com/store/apps/details?id={game['package']}"


def published_news():
    return [n for n in NEWS if not n.get("draft")]


def game_by_slug(slug):
    return next(g for g in GAMES if g["slug"] == slug)


def page(lang, path, title, description, body, active=None):
    """Wraps a page body in the shared head, header and footer and writes it."""
    t = UI[lang]
    other = "ko" if lang == "en" else "en"
    full_title = f"{title} – {STUDIO['name']}" if title else f"{STUDIO['name']} – {t['tagline']}"
    alt = "".join(f'<link rel="alternate" hreflang="{l}" href="{STUDIO["domain"]}{url(l, path)}">' for l in LANGS)
    alt += f'<link rel="alternate" hreflang="x-default" href="{STUDIO["domain"]}{url("en", path)}">'
    nav_items = [("games", t["nav_games"], url(lang) + "#games"), ("news", t["nav_news"], url(lang, "news/")),
                 ("about", t["nav_about"], url(lang, "about/")), ("support", t["nav_support"], url(lang, "support/"))]
    nav = "".join(f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}>{e(label)}</a>'
                  for key, label, href in nav_items)
    nav += f'<a class="lang" href="{url(other, path)}" hreflang="{other}" lang="{other}">{UI[other]["lang_name"]}</a>'
    doc = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{STUDIO['domain']}{url(lang, path)}">
{alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(STUDIO['name'])}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{STUDIO['domain']}{url(lang, path)}">
<meta property="og:image" content="{STUDIO['domain']}/assets/logo.png">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="brand" href="{url(lang)}"><img src="/assets/logo-256.png" alt="" width="34" height="34">{e(STUDIO['name'])}</a>
    <button class="menu-toggle" aria-label="Menu" aria-expanded="false" onclick="var n=document.getElementById('nav');n.classList.toggle('open');this.setAttribute('aria-expanded',n.classList.contains('open'))">{ICON_MENU}</button>
    <nav class="nav" id="nav">{nav}</nav>
  </div>
</header>
<main>
{body}
</main>
<footer class="site-footer">
  <div class="container">
    <nav>
      <a href="/privacy.html">{e(t['privacy'])}</a>
      <a href="{url(lang, 'support/')}">{e(t['support'])}</a>
      <a href="mailto:{STUDIO['email']}">{e(t['contact'])}</a>
      <a href="{STUDIO['youtube']}" target="_blank" rel="noopener">YouTube</a>
      <a href="{STUDIO['instagram']}" target="_blank" rel="noopener">Instagram</a>
    </nav>
    <p>© 2026 {e(STUDIO['name'])}. {e(t['rights'])}</p>
  </div>
</footer>
</body>
</html>
"""
    out = os.path.join(ROOT, url(lang, path).lstrip("/"), "index.html") if not path.endswith(".html") \
        else os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(doc)
    return url(lang, path)


def game_card(lang, g):
    t, c = UI[lang], g[lang]
    badge = f' <span class="badge">{t["new"]}</span>' if g["new"] else ""
    kind = t["kind_game"] if g["kind"] == "game" else t["kind_learning"]
    return f"""<a class="card game-card" href="{url(lang, f'games/{g["slug"]}/')}">
  <img src="{g['icon']}=s192" alt="" width="76" height="76" loading="lazy">
  <div><div class="title">{e(c['name'])}{badge}</div><div class="desc">{e(c['short'])}</div>
  <div class="tags"><span class="tag">{e(kind)}</span><span class="tag">Android</span></div></div>
</a>"""


def news_item(lang, n, link_game=True):
    t, c = UI[lang], n[lang]
    more = ""
    if link_game and n.get("game"):
        g = game_by_slug(n["game"])
        more = f'<a class="more" href="{url(lang, f"games/{g["slug"]}/")}">{e(g[lang]["name"])} →</a>'
    return f"""<article class="card news-item"><time datetime="{n['date']}">{n['date']}</time>
  <h3>{e(c['title'])}</h3><p>{e(c['body'])}</p>{more}</article>"""


def build_home(lang):
    t = UI[lang]
    cards = "\n".join(game_card(lang, g) for g in GAMES)
    news = "\n".join(news_item(lang, n) for n in published_news()[:2])
    body = f"""<section class="hero container">
  <img class="logo" src="/assets/logo-256.png" alt="{e(STUDIO['name'])} logo" width="116" height="116">
  <h1>{e(STUDIO['name'])}</h1>
  <p class="tagline">{e(t['tagline'])}</p>
  <p class="lead">{e(t['hero_text'])}</p>
  <div class="social">
    <a href="{STUDIO['youtube']}" target="_blank" rel="noopener">{ICON_YT} YouTube</a>
    <a href="{STUDIO['instagram']}" target="_blank" rel="noopener">{ICON_IG} Instagram</a>
  </div>
</section>
<section class="section container" id="games">
  <div class="section-head"><h2>{e(t['games_title'])}</h2><p>{e(t['games_lead'])}</p></div>
  <div class="games">
{cards}
  </div>
</section>
<section class="section container">
  <div class="section-head"><h2>{e(t['news_latest'])}</h2><a href="{url(lang, 'news/')}">{e(t['news_all'])} →</a></div>
  <div class="news-list">
{news}
  </div>
</section>"""
    page(lang, "", None, t["hero_text"], body, active=None)


def build_game(lang, g):
    t, c = UI[lang], g[lang]
    path = f"games/{g['slug']}/"
    shots = "".join(f'<img src="{s}=h720" alt="" loading="lazy" height="360">' for s in SHOTS.get(g["shots_key"], []))
    paras = "".join(f"<p>{e(p)}</p>" for p in c["body"])
    feats = "".join(f"<li>{e(f)}</li>" for f in c["features"])
    video = ""
    if g.get("youtube"):
        video = f"""<section class="section container">
  <div class="section-head"><h2>{e(t['trailer'])}</h2></div>
  <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/{g['youtube']}" title="{e(c['name'])}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</section>"""
    others = "\n".join(game_card(lang, o) for o in GAMES if o is not g)
    body = f"""<section class="container">
  <div class="game-hero">
    <img src="{g['icon']}=s256" alt="{e(c['name'])} icon" width="120" height="120">
    <div><h1>{e(c['name'])}</h1><p>{e(c['short'])}</p>
    <a class="btn" href="{play_url(g)}" target="_blank" rel="noopener">{ICON_PLAY} {e(t['get_play'])}</a></div>
  </div>
</section>
<section class="section container">
  <div class="section-head"><h2>{e(t['screenshots'])}</h2></div>
  <div class="shots">{shots}</div>
</section>
{video}
<section class="section container">
  <div class="two-col">
    <div class="card prose"><h2>{e(t['about_game'])}</h2>{paras}</div>
    <div class="card"><h2>{e(t['features'])}</h2><ul class="features">{feats}</ul>
      <h2 style="margin-top:20px">{e(t['game_links'])}</h2>
      <ul class="link-list"><li><a href="/privacy.html">{e(t['privacy'])}</a></li><li><a href="{url(lang, 'support/')}">{e(t['support'])}</a></li></ul>
    </div>
  </div>
</section>
<section class="section container">
  <div class="section-head"><h2>{e(t['more_games'])}</h2></div>
  <div class="games">
{others}
  </div>
</section>"""
    page(lang, path, c["name"], c["short"], body, active="games")


def build_news(lang):
    t = UI[lang]
    items = "\n".join(news_item(lang, n) for n in published_news())
    body = f"""<section class="container"><h1 class="page-title">{e(t['news_title'])}</h1></section>
<section class="section container"><div class="news-list">
{items}
</div></section>"""
    page(lang, "news/", t["news_title"], t["news_title"], body, active="news")


def build_about(lang):
    t = UI[lang]
    paras = "".join(f"<p>{e(p)}</p>" for p in ABOUT[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['about_title'])}</h1></section>
<section class="section container"><div class="card prose">{paras}
  <div class="social" style="justify-content:flex-start">
    <a class="btn" href="{STUDIO['youtube']}" target="_blank" rel="noopener">{ICON_YT} YouTube</a>
    <a class="btn" href="{STUDIO['instagram']}" target="_blank" rel="noopener">{ICON_IG} Instagram</a>
  </div>
</div></section>"""
    page(lang, "about/", t["about_title"], ABOUT[lang][0], body, active="about")


def build_support(lang):
    t = UI[lang]
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in FAQ[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['nav_support'])}</h1></section>
<section class="section container"><div class="card faq"><h2>{e(t['faq_title'])}</h2>{faq}</div></section>
<section class="section container" id="contact"><div class="card prose"><h2>{e(t['contact_title'])}</h2>
  <p>{e(t['contact_text'])}</p>
  <p><a class="btn" href="mailto:{STUDIO['email']}">{e(STUDIO['email'])}</a></p>
  <p>{e(t['contact_tip'])}</p>
</div></section>"""
    page(lang, "support/", t["nav_support"], t["contact_text"], body, active="support")


def build_404():
    t = UI["en"]
    body = f"""<section class="container" style="text-align:center"><h1 class="page-title">{e(t['not_found_title'])}</h1>
<p class="page-lead">{e(t['not_found_text'])} / {e(UI['ko']['not_found_text'])}</p>
<p style="margin-top:22px"><a class="btn light" href="/">{e(t['back_home'])}</a> <a class="btn light" href="/ko/">{e(UI['ko']['back_home'])}</a></p></section>"""
    page("en", "404.html", t["not_found_title"], t["not_found_text"], body)


def build_sitemap(urls):
    entries = "".join(f"<url><loc>{STUDIO['domain']}{u}</loc></url>" for u in urls)
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n')
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {STUDIO['domain']}/sitemap.xml\n")


def main():
    urls = []
    for lang in LANGS:
        build_home(lang)
        urls.append(url(lang))
        for g in GAMES:
            build_game(lang, g)
            urls.append(url(lang, f"games/{g['slug']}/"))
        for fn, path in [(build_news, "news/"), (build_about, "about/"), (build_support, "support/")]:
            fn(lang)
            urls.append(url(lang, path))
    build_404()
    urls.append("/privacy.html")
    build_sitemap(urls)
    print(f"built {len(urls) - 1} pages + 404, sitemap, robots")


main()
