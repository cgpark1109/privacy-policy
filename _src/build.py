# Builds the studio site (English at /, Korean at /ko/) from content.py.
# Run from the repository root: python _src/build.py
# Jekyll on GitHub Pages skips folders starting with "_", so _src stays private.
import hashlib
import html
import json
import os
import re
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(__file__))
from content import ABOUT, FAQ, GAMES, GUIDES, NEWS, STUDIO, TERMS, TERMS_DATE, UI, WEB_GAMES  # noqa: E402
from qr import qr_svg  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_VERSION = hashlib.sha1(open(os.path.join(ROOT, "assets", "site.css"), "rb").read()).hexdigest()[:10]
SHOTS = json.load(open(os.path.join(os.path.dirname(__file__), "screenshots.json"), encoding="utf-8"))
LANGS = ["en", "ko"]
PREFIX = {"en": "", "ko": "/ko"}
e = html.escape

ICON_YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'
ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>'
ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 1.8 14 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1zm11.5 11.3 2.6 2.6-12 6.9 9.4-9.5zm3.6-3.6 3 1.7c.8.5.8 1.6 0 2.1l-3 1.7-2.8-2.9 2.8-2.6zM5.7 1.4l12 6.9-2.6 2.6-9.4-9.5z"/></svg>'
ICON_WEB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg>'
ICON_CALC = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v3h12V5a1 1 0 0 0-1-1H7zm-1 6v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9H6z'
             'm2 2h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-6 3h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z"/></svg>')
ICON_MENU ='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'


def url(lang, path=""):
    return f"{PREFIX[lang]}/{path}" if path else f"{PREFIX[lang]}/"


def play_url(game, medium=None, content=None):
    """Google Play link. With a medium, it carries UTM tags in the install referrer, so Play Console
    (Store listing acquisition > tracked channels) shows installs that came from this site."""
    link = f"https://play.google.com/store/apps/details?id={game['package']}"
    if medium:
        utm = f"utm_source=kysystemstudio&utm_medium={medium}&utm_campaign=game_page"
        if content:
            utm += f"&utm_content={content}"
        link += "&referrer=" + quote(utm, safe="")
    return link


def go_url(game):
    """Short link on this site for the QR code; it forwards to Google Play (see build_go)."""
    return f"{STUDIO['domain']}/go/{game['slug']}/"


def ld_json(data):
    """A JSON-LD <script> block (structured data for search engines)."""
    text = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">{text}</script>'


ICON_SPEAK = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z'
              'M14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>')
# Plays {{say:...}} words with the browser's Korean voice; buttons are hidden where speech isn't available.
SAY_SCRIPT = """<script>(function(){var d=document.documentElement;
if(!('speechSynthesis' in window)){d.classList.add('no-tts');return;}
document.addEventListener('click',function(ev){var b=ev.target.closest('.say');if(!b)return;
var u=new SpeechSynthesisUtterance(b.getAttribute('data-say'));u.lang='ko-KR';u.rate=0.8;
speechSynthesis.cancel();speechSynthesis.speak(u);});})();</script>"""


def load_articles(section="learn", lang="en"):
    """Hangul guides: _src/learn/<slug>.html, each starting with an HTML comment holding JSON metadata
    (title, description, date, updated, order). {{say:한글}} becomes a listen button."""
    folder = os.path.join(os.path.dirname(__file__), section)
    articles = []
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".html"):
            continue
        text = open(os.path.join(folder, name), encoding="utf-8").read()
        m = re.match(r"\s*<!--(.*?)-->(.*)", text, re.S)
        if not m:
            sys.exit(f"_src/learn/{name} has no metadata comment")
        meta = json.loads(m.group(1))
        body = re.sub(r"\{\{say:([^}]+)\}\}",
                      lambda k: f'<button type="button" class="say" data-say="{e(k.group(1))}" aria-label="Listen: {e(k.group(1))}">{ICON_SPEAK}</button>',
                      m.group(2))
        text = re.sub(r"<[^>]+>", " ", body)
        # Reading time: about 200 words a minute in English, about 500 characters a minute in Korean.
        size = len(re.sub(r"\s", "", text)) / 500 if lang == "ko" else len(text.split()) / 200
        articles.append({**meta, "slug": name[:-5], "body": body, "minutes": max(1, round(size))})
    return sorted(articles, key=lambda a: a["order"])


ARTICLES = load_articles()          # Hangul guides, English, /learn/
HISTORY = load_articles("history", "ko")  # world history reading, Korean, /ko/history/


def published_news():
    return [n for n in NEWS if not n.get("draft")]


def privacy_url(lang):
    """The English policy stays at /privacy.html (linked from Google Play); the Korean one is /ko/privacy/."""
    return "/privacy.html" if lang == "en" else url(lang, "privacy/")


def game_by_slug(slug):
    return next(g for g in GAMES if g["slug"] == slug)


def page(lang, path, title, description, body, active=None, head_extra="", og_image=None, translated=True,
         show_updated=True):
    """Wraps a page body in the shared head, header and footer and writes it.
    translated=False is for pages that exist in one language only: the language switch goes to the other home.
    show_updated=False leaves out the footer's "Last updated" line (the privacy policies carry their own date)."""
    t = UI[lang]
    other = "ko" if lang == "en" else "en"
    full_title = f"{title} – {STUDIO['name']}" if title else f"{STUDIO['name']} – {t['tagline']}"
    alt = ""
    if translated:
        alt = "".join(f'<link rel="alternate" hreflang="{l}" href="{STUDIO["domain"]}{url(l, path)}">' for l in LANGS)
        alt += f'<link rel="alternate" hreflang="x-default" href="{STUDIO["domain"]}{url("en", path)}">'
    image = og_image or f"{STUDIO['domain']}/assets/logo.png"
    nav_items = [("games", t["nav_games"], url(lang) + "#games"), ("learn", t["nav_learn"], "/learn/"),
                 *([("history", t["nav_history"], url(lang, "history/"))] if lang == "ko" else []),
                 ("calc", t["nav_calc"], STUDIO["calc"]),
                 ("news", t["nav_news"], url(lang, "news/")),
                 ("about", t["nav_about"], url(lang, "about/")), ("support", t["nav_support"], url(lang, "support/"))]
    nav = "".join(f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}>{e(label)}</a>'
                  for key, label, href in nav_items)
    updated = (f'    <p class="updated">{e(t["last_updated"])}: '
               f'<time datetime="{STUDIO["updated"]}">{STUDIO["updated"]}</time></p>\n') if show_updated else ""
    nav += f'<a class="lang" href="{url(other, path) if translated else url(other)}" hreflang="{other}" lang="{other}">{UI[other]["lang_name"]}</a>'
    doc = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<meta name="google-adsense-account" content="{STUDIO['adsense']}">
<link rel="canonical" href="{STUDIO['domain']}{url(lang, path)}">
{alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(STUDIO['name'])}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{STUDIO['domain']}{url(lang, path)}">
<meta property="og:image" content="{image}">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={CSS_VERSION}">
{head_extra}
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
      <a href="{privacy_url(lang)}">{e(t['privacy'])}</a>
      <a href="{url(lang, 'terms/')}">{e(t['terms'])}</a>
      <a href="{url(lang, 'play/')}">{e(t['play_title'])}</a>
      <a href="{STUDIO['calc']}" hreflang="ko">{e(t['calc_link'])}</a>
      <a href="{url(lang, 'support/')}">{e(t['support'])}</a>
      <a href="mailto:{STUDIO['email']}">{e(t['contact'])}</a>
      <a href="{STUDIO['youtube']}" target="_blank" rel="noopener">YouTube</a>
      <a href="{STUDIO['instagram']}" target="_blank" rel="noopener">Instagram</a>
    </nav>
    <p>© 2026 {e(STUDIO['name'])}. {e(t['rights'])}</p>
{updated}  </div>
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
    if n.get("link"):
        more = f'<a class="more" href="{n["link"]["href"]}">{e(n["link"][lang])} →</a>'
    elif link_game and n.get("game"):
        web = next((w for w in WEB_GAMES if w["slug"] == n["game"]), None)
        if web:  # browser-only game: link straight to it
            more = f'<a class="more" href="/play/{web["slug"]}/">{e(web[lang]["name"])} →</a>'
        else:
            g = game_by_slug(n["game"])
            more = f'<a class="more" href="{url(lang, f"games/{g["slug"]}/")}">{e(g[lang]["name"])} →</a>'
    return f"""<article class="card news-item"><time datetime="{n['date']}">{n['date']}</time>
  <h3>{e(c['title'])}</h3><p>{e(c['body'])}</p>{more}</article>"""


def build_home(lang):
    t = UI[lang]
    cards = "\n".join(game_card(lang, g) for g in GAMES)
    news = "\n".join(news_item(lang, n) for n in published_news()[:2])
    # Teaser cards under the game list: browser games (if any) and the 계산만물상 calculators site.
    teasers = []
    if any(g.get("web") for g in GAMES):
        teasers.append(f"""<div class="card play-teaser">
  <p>{ICON_WEB} {e(t['play_teaser'])}</p>
  <a class="btn light" href="{url(lang, 'play/')}">{e(t['play_teaser_cta'])} →</a>
</div>""")
    teasers.append(f"""<div class="card play-teaser">
  <p>{ICON_CALC} {e(t['calc_teaser'])}</p>
  <a class="btn light" href="{STUDIO['calc']}" hreflang="ko">{e(t['calc_teaser_cta'])} →</a>
</div>""")
    teaser_section = f'<section class="section container teasers">\n{chr(10).join(teasers)}\n</section>'
    # What the site offers, with live counts, then the most recent guides.
    counts = {"games": len(GAMES), "guides": len(ARTICLES), "history": len(HISTORY),
              "web": sum(1 for g in GAMES if g.get("web")) + len(WEB_GAMES)}
    links = {"games": "#games", "guides": "/learn/", "history": url("ko", "history/"), "web": url(lang, "play/")}
    points = "".join(f'<li><a href="{links[key]}"><strong>{e(label)}</strong></a>: {e(text.format(**counts))}</li>'
                     for key, label, text in t["home_points"])
    intro = f"""<section class="section container"><div class="card prose home-intro">
  <h2>{e(t['home_intro_title'])}</h2><p>{e(t['home_intro'])}</p><ul>{points}</ul>
</div></section>"""
    latest = sorted(ARTICLES, key=lambda a: (a.get("updated", a["date"]), a["order"]), reverse=True)[:3]
    guides = "\n".join(article_card(a, lang) for a in latest)
    history_section = ""
    if lang == "ko" and HISTORY:
        recent = sorted(HISTORY, key=lambda a: (a.get("updated", a["date"]), a["order"]), reverse=True)[:3]
        history_cards = "\n".join(article_card(a, "ko", url("ko", "history/"), "ko") for a in recent)
        history_section = f"""<section class="section container">
  <div class="section-head"><h2>{e(t['home_history_title'])}</h2><a href="{url('ko', 'history/')}">{e(t['home_history_all'])} →</a></div>
  <div class="guide-list">
{history_cards}
  </div>
</section>"""
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
{intro}
<section class="section container">
  <div class="section-head"><h2>{e(t['home_guides_title'])}</h2><a href="/learn/" hreflang="en">{e(t['home_guides_all'])} →</a></div>
  <div class="guide-list">
{guides}
  </div>
</section>
{history_section}
<section class="section container" id="games">
  <div class="section-head"><h2>{e(t['games_title'])}</h2><p>{e(t['games_lead'])}</p></div>
  <div class="games">
{cards}
  </div>
</section>
{teaser_section}
<section class="section container">
  <div class="section-head"><h2>{e(t['news_latest'])}</h2><a href="{url(lang, 'news/')}">{e(t['news_all'])} →</a></div>
  <div class="news-list">
{news}
  </div>
</section>"""
    org = {"@context": "https://schema.org", "@type": "Organization", "name": STUDIO["name"],
           "url": STUDIO["domain"] + "/", "logo": f"{STUDIO['domain']}/assets/logo-256.png",
           "email": STUDIO["email"], "sameAs": [STUDIO["youtube"], STUDIO["instagram"]]}
    site = {"@context": "https://schema.org", "@type": "WebSite", "name": STUDIO["name"],
            "url": STUDIO["domain"] + url(lang), "inLanguage": lang}
    page(lang, "", None, t["hero_text"], body, active=None, head_extra=ld_json(org) + ld_json(site))


def build_game(lang, g):
    t, c = UI[lang], {**g[lang], **GUIDES.get(g["slug"], {}).get(lang, {})}
    path = f"games/{g['slug']}/"
    shots = "".join(f'<img src="{s}=h720" alt="" loading="lazy" height="360">' for s in SHOTS.get(g["shots_key"], []))
    paras = "".join(f"<p>{e(p)}</p>" for p in c["body"])
    feats = "".join(f"<li>{e(f)}</li>" for f in c["features"])
    video = ""
    if g.get("youtube"):
        video = f"""<section class="section container">
  <div class="section-head"><h2>{e(t['trailer'])}</h2></div>
  <div class="video{" wide" if g.get("video_wide") else ""}"><iframe src="https://www.youtube-nocookie.com/embed/{g['youtube']}" title="{e(c['name'])}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</section>"""
    others = "\n".join(game_card(lang, o) for o in GAMES if o is not g)
    web_btn = (f' <a class="btn light" href="{g["web"]}">{ICON_WEB} {e(t["play_now_web"])}</a>'
               if g.get("web") else "")
    guide = ""
    if c.get("howto") or c.get("tips"):
        steps = "".join(f"<li>{e(s)}</li>" for s in c.get("howto", []))
        tips = "".join(f"<li>{e(s)}</li>" for s in c.get("tips", []))
        guide = f"""<section class="section container">
  <div class="two-col">
    <div class="card prose guide"><h2>{e(t['how_to_play'])}</h2><ol class="steps">{steps}</ol></div>
    <div class="card prose guide"><h2>{e(t['tips'])}</h2><ul class="tips">{tips}</ul></div>
  </div>
</section>"""
    if c.get("faq"):
        faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in c["faq"])
        guide += f"""
<section class="section container"><div class="card faq"><h2>{e(t['faq_title'])}</h2>{faq}</div></section>"""
    body = f"""<section class="container">
  <div class="game-hero">
    <img src="{g['icon']}=s256" alt="{e(c['name'])} icon" width="120" height="120">
    <div><h1>{e(c['name'])}</h1><p>{e(c['short'])}</p>
    <div class="hero-actions"><a class="btn" href="{e(play_url(g, "website", lang))}" target="_blank" rel="noopener">{ICON_PLAY} {e(t['get_play'])}</a>{web_btn}</div></div>
    <div class="qr">{qr_svg(go_url(g), e(t['qr_label']))}<span>{e(t['scan_qr'])}</span></div>
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
      <ul class="link-list"><li><a href="{privacy_url(lang)}">{e(t['privacy'])}</a></li><li><a href="{url(lang, 'support/')}">{e(t['support'])}</a></li></ul>
    </div>
  </div>
</section>
{guide}
<section class="section container">
  <div class="section-head"><h2>{e(t['more_games'])}</h2></div>
  <div class="games">
{others}
  </div>
</section>"""
    app = {"@context": "https://schema.org", "@type": "MobileApplication", "name": c["name"],
           "description": c["short"], "url": STUDIO["domain"] + url(lang, path), "inLanguage": lang,
           "operatingSystem": "Android",
           "applicationCategory": "GameApplication" if g["kind"] == "game" else "EducationalApplication",
           "image": f"{g['icon']}=s512", "screenshot": [f"{s}=h720" for s in SHOTS.get(g["shots_key"], [])],
           "installUrl": play_url(g), "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
           "publisher": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"}}
    page(lang, path, c["name"], c["short"], body, active="games", head_extra=ld_json(app),
         og_image=f"{g['icon']}=s512")


def build_play(lang):
    """Browser versions, kept on their own page so game pages lead with the app."""
    t = UI[lang]
    cards = ""
    for g in (g for g in GAMES if g.get("web")):
        c = g[lang]
        cards += f"""<div class="card play-card">
  <img src="{g['icon']}=s192" alt="" width="76" height="76" loading="lazy">
  <div><a class="title" href="{url(lang, f'games/{g["slug"]}/')}">{e(c['name'])}</a><div class="desc">{e(c['short'])}</div>
  <div class="play-actions"><a class="btn" href="{e(g['web'])}">{ICON_WEB} {e(t['play_now'])}</a>
  <a class="text-link" href="{e(play_url(g, "website", lang))}" target="_blank" rel="noopener">{ICON_PLAY} {e(t['play_get_app'])}</a></div></div>
</div>
"""
    for g in WEB_GAMES:
        c = g[lang]
        cards += f"""<div class="card play-card">
  <img src="{g['icon']}" alt="" width="76" height="76" loading="lazy">
  <div><a class="title" href="/play/{g['slug']}/">{e(c['name'])}</a><div class="desc">{e(c['short'])}</div>
  <div class="play-actions"><a class="btn" href="/play/{g['slug']}/">{ICON_WEB} {e(t['play_now'])}</a></div></div>
</div>
"""
    body = f"""<section class="container"><h1 class="page-title">{e(t['play_title'])}</h1><p class="page-lead">{e(t['play_lead'])}</p></section>
<section class="section container"><div class="games">
{cards}</div>
<p class="play-note">{e(t['play_note'])}</p></section>"""
    page(lang, "play/", t["play_title"], t["play_lead"], body)


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
    sections = "".join((f"<h2>{e(h)}</h2>" if h else "") + "".join(f"<p>{e(p)}</p>" for p in paras)
                       for h, paras in ABOUT[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['about_title'])}</h1></section>
<section class="section container"><div class="card prose about">{sections}
  <div class="actions">
    <a class="btn" href="mailto:{STUDIO['email']}">{e(t['contact'])}</a>
    <a class="btn" href="{STUDIO['youtube']}" target="_blank" rel="noopener">{ICON_YT} YouTube</a>
    <a class="btn" href="{STUDIO['instagram']}" target="_blank" rel="noopener">{ICON_IG} Instagram</a>
  </div>
</div></section>"""
    page(lang, "about/", t["about_title"], ABOUT[lang][0][1][0], body, active="about")


def build_terms(lang):
    t = UI[lang]
    sections = "\n".join(f"<section><h2>{e(h)}</h2>" + "".join(f"<p>{e(p)}</p>" for p in paras) + "</section>"
                         for h, paras in TERMS[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['terms'])}</h1></section>
<section class="section container"><div class="card policy">
<p class="updated">{e(t['terms_date'])}: {e(TERMS_DATE[lang])}</p>
{sections}
</div></section>"""
    page(lang, "terms/", t["terms"], t["terms_desc"], body, show_updated=False)


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


def article_card(a, lang="en", base="/learn/", article_lang="en"):
    """An article card. On Korean pages an English guide shows its one-line Korean summary ("ko" in its metadata)."""
    desc = a.get("ko", a["description"]) if lang == "ko" and article_lang == "en" else a["description"]
    hreflang = f' hreflang="{article_lang}"' if lang != article_lang else ""
    read_time = UI[lang]["read_time"] if article_lang != lang else UI[lang]["read_time_same"]
    return f"""<a class="card guide-card" href="{base}{a['slug']}/"{hreflang}>
  <span class="title" lang="{article_lang}">{e(a['title'])}</span><span class="desc">{e(desc)}</span>
  <span class="meta">{e(read_time.format(n=a['minutes']))}</span></a>"""


def learn_apps():
    """'Practice with our apps' links under the guides: the two Korean learning apps."""
    t = UI["en"]
    items = []
    for slug in ("learn-korean-hangul", "korean-word-quiz"):
        g = game_by_slug(slug)
        web = f' · <a href="{g["web"]}">{e(t["play_now_web"])}</a>' if g.get("web") else ""
        items.append(f'<li><a href="{url("en", f"games/{slug}/")}"><strong>{e(g["en"]["name"])}</strong></a>: '
                     f'{e(g["en"]["short"])}{web}</li>')
    return f"""<div class="card prose guide"><h2>{e(t['learn_practice'])}</h2><ul>{''.join(items)}</ul></div>"""


def build_learn():
    t = UI["en"]
    cards = "\n".join(article_card(a) for a in ARTICLES)
    paras = "".join(f"<p>{e(p)}</p>" for p in t["learn_intro"])
    body = f"""<section class="container"><h1 class="page-title">{e(t['learn_title'])}</h1>
<p class="page-lead">{e(t['learn_lead'])}</p></section>
<section class="section container"><div class="card prose">{paras}</div></section>
<section class="section container">
  <div class="section-head"><h2>{e(t['learn_guides'])}</h2></div>
  <div class="guide-list">
{cards}
  </div>
</section>
<section class="section container">{learn_apps()}</section>"""
    page("en", "learn/", t["learn_title"], t["learn_lead"], body, active="learn", translated=False)
    for i, a in enumerate(ARTICLES):
        prev = ARTICLES[i - 1] if i > 0 else None
        nxt = ARTICLES[i + 1] if i + 1 < len(ARTICLES) else None
        pager = ""
        if prev:
            pager += f'<a class="prev" href="/learn/{prev["slug"]}/"><span>← {e(t["learn_prev"])}</span>{e(prev["title"])}</a>'
        if nxt:
            pager += f'<a class="next" href="/learn/{nxt["slug"]}/"><span>{e(t["learn_next"])} →</span>{e(nxt["title"])}</a>'
        dates = f'<time datetime="{a["date"]}">{a["date"]}</time>'
        if a.get("updated") and a["updated"] != a["date"]:
            dates += f' · {e(t["last_updated"])} <time datetime="{a["updated"]}">{a["updated"]}</time>'
        body = f"""<section class="container article-head">
  <a class="crumb" href="/learn/">{e(t['learn_title'])}</a>
  <h1 class="page-title">{e(a['title'])}</h1>
  <p class="article-meta">{dates} · {a['minutes']} {e(t['min_read'])} · {e(STUDIO['name'])}</p>
</section>
<section class="section container"><article class="card article" lang="en">
{a['body']}
</article></section>
<section class="section container"><nav class="pager">{pager}</nav></section>
<section class="section container">{learn_apps()}</section>"""
        ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"],
              "description": a["description"], "inLanguage": "en",
              "datePublished": a["date"], "dateModified": a.get("updated", a["date"]),
              "mainEntityOfPage": f"{STUDIO['domain']}/learn/{a['slug']}/",
              "author": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"},
              "publisher": {"@type": "Organization", "name": STUDIO["name"],
                            "logo": {"@type": "ImageObject", "url": f"{STUDIO['domain']}/assets/logo-256.png"}}}
        page("en", f"learn/{a['slug']}/", a["title"], a["description"], body, active="learn", translated=False,
             head_extra=ld_json(ld) + SAY_SCRIPT)


def history_quiz_card():
    """'Test yourself' card under the history articles: the World History Quiz app and browser version."""
    t, g = UI["ko"], game_by_slug("world-history-quiz")
    web = f' · <a href="{g["web"]}">{e(t["play_now_web"])}</a>' if g.get("web") else ""
    return (f'<div class="card prose guide"><h2>{e(t["history_practice"])}</h2><ul><li>'
            f'<a href="{url("ko", "games/world-history-quiz/")}"><strong>{e(g["ko"]["name"])}</strong></a>: '
            f'{e(t["history_practice_text"])}{web}</li></ul></div>')


def build_history():
    """Korean world history reading at /ko/history/, from _src/history/<slug>.html (same format as the guides)."""
    if not HISTORY:
        return []
    t = UI["ko"]
    cards = "\n".join(article_card(a, "ko", url("ko", "history/"), "ko") for a in HISTORY)
    paras = "".join(f"<p>{e(p)}</p>" for p in t["history_intro"])
    body = f"""<section class="container"><h1 class="page-title">{e(t['history_title'])}</h1>
<p class="page-lead">{e(t['history_lead'])}</p></section>
<section class="section container"><div class="card prose">{paras}</div></section>
<section class="section container">
  <div class="section-head"><h2>{e(t['history_list'])}</h2></div>
  <div class="guide-list">
{cards}
  </div>
</section>
<section class="section container">{history_quiz_card()}</section>"""
    page("ko", "history/", t["history_title"], t["history_lead"], body, active="history", translated=False)
    urls = [url("ko", "history/")]
    for i, a in enumerate(HISTORY):
        prev = HISTORY[i - 1] if i > 0 else None
        nxt = HISTORY[i + 1] if i + 1 < len(HISTORY) else None
        pager = ""
        if prev:
            prev_href = url("ko", "history/" + prev["slug"] + "/")
            pager += f'<a class="prev" href="{prev_href}"><span>← {e(t["prev_article"])}</span>{e(prev["title"])}</a>'
        if nxt:
            next_href = url("ko", "history/" + nxt["slug"] + "/")
            pager += f'<a class="next" href="{next_href}"><span>{e(t["next_article"])} →</span>{e(nxt["title"])}</a>'
        path = f"history/{a['slug']}/"
        body = f"""<section class="container article-head">
  <a class="crumb" href="{url('ko', 'history/')}">{e(t['history_title'])}</a>
  <h1 class="page-title">{e(a['title'])}</h1>
  <p class="article-meta"><time datetime="{a['date']}">{a['date']}</time> · {e(t['read_time_same'].format(n=a['minutes']))} · {e(STUDIO['name'])}</p>
</section>
<section class="section container"><article class="card article">
{a['body']}
</article></section>
<section class="section container"><nav class="pager">{pager}</nav></section>
<section class="section container">{history_quiz_card()}</section>"""
        ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"],
              "description": a["description"], "inLanguage": "ko",
              "datePublished": a["date"], "dateModified": a.get("updated", a["date"]),
              "mainEntityOfPage": f"{STUDIO['domain']}{url('ko', path)}",
              "author": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"},
              "publisher": {"@type": "Organization", "name": STUDIO["name"],
                            "logo": {"@type": "ImageObject", "url": f"{STUDIO['domain']}/assets/logo-256.png"}}}
        page("ko", path, a["title"], a["description"], body, active="history", translated=False, head_extra=ld_json(ld))
        urls.append(url("ko", path))
    return urls


def build_404():
    t = UI["en"]
    body = f"""<section class="container" style="text-align:center"><h1 class="page-title">{e(t['not_found_title'])}</h1>
<p class="page-lead">{e(t['not_found_text'])} / {e(UI['ko']['not_found_text'])}</p>
<p style="margin-top:22px"><a class="btn light" href="/">{e(t['back_home'])}</a> <a class="btn light" href="/ko/">{e(UI['ko']['back_home'])}</a></p></section>"""
    page("en", "404.html", t["not_found_title"], t["not_found_text"], body, translated=False)


POLICY_START, POLICY_END = "<!-- policy:start -->", "<!-- policy:end -->"


def build_privacy(lang):
    """The policy text between the policy markers is edited by hand (privacy.html for English,
    ko/privacy/index.html for Korean); everything around it (header, footer, game list) is regenerated."""
    t = UI[lang]
    out_path = "privacy.html" if lang == "en" else "privacy/"
    path = os.path.join(ROOT, privacy_url(lang).lstrip("/") + ("index.html" if lang != "en" else ""))
    m = re.search(re.escape(POLICY_START) + r"(.*?)" + re.escape(POLICY_END),
                  open(path, encoding="utf-8").read(), re.S)
    if not m:
        sys.exit(f"{path} has no {POLICY_START} ... {POLICY_END} section")
    cards = "\n".join(game_card(lang, g) for g in GAMES)
    body = f"""<section class="container"><h1 class="page-title">{e(t['privacy'])}</h1></section>
<section class="section container"><div class="card policy">{POLICY_START}{m.group(1)}{POLICY_END}</div></section>
<section class="section container">
  <div class="section-head"><h2>{e(t['games_title'])}</h2><p>{e(t['games_lead'])}</p></div>
  <div class="games">
{cards}
  </div>
</section>"""
    page(lang, out_path, t["privacy"], t["privacy_desc"], body, translated=False, show_updated=False)


def build_go(g):
    """/go/<slug>/ forwards a scanned QR code to Google Play, tagged utm_medium=qr. Not in the sitemap."""
    target = play_url(g, "qr")
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>{e(g['en']['name'])} – Google Play</title>
<meta http-equiv="refresh" content="0; url={e(target)}">
<link rel="canonical" href="{STUDIO['domain']}{url('en', f"games/{g['slug']}/")}">
</head>
<body>
<p><a href="{e(target)}">{e(g['en']['name'])} on Google Play</a></p>
<script>location.replace({json.dumps(target)})</script>
</body>
</html>
"""
    out = os.path.join(ROOT, "go", g["slug"], "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(doc)


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
        for fn, path in [(build_play, "play/"), (build_news, "news/"), (build_about, "about/"), (build_support, "support/"),
                         (build_terms, "terms/")]:
            fn(lang)
            urls.append(url(lang, path))
    urls += [g["web"] for g in GAMES if g.get("web", "").startswith("/play/")]
    for g in WEB_GAMES:
        urls += [f"/play/{g['slug']}/"] + [f"/play/{g['slug']}/{p}" for p in g.get("pages", [])]
    build_learn()
    urls += build_history()
    urls += ["/learn/"] + [f"/learn/{a['slug']}/" for a in ARTICLES]
    build_404()
    for lang in LANGS:
        build_privacy(lang)
    for g in GAMES:
        build_go(g)
    urls += [privacy_url(lang) for lang in LANGS]
    build_sitemap(urls)
    print(f"built {len(urls) - 1} pages + 404, sitemap, robots")


main()
